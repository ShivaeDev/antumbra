import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FLAGSHIP_REQUEST, VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Owner } from "@antumbra/platform-access/policy.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import { RunnerContract } from "@antumbra/platform-runner/rpc.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { prepareDatabase } from "@antumbra/server/storage.ts";
import { AgentsContract } from "@antumbra/server-agents/contract.ts";
import { RoleSettingsContract } from "@antumbra/server-role-settings/contract.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NodeWS from "@effect/platform-node/NodeWS";
import { Deferred, Effect, FileSystem, Option, Redacted, Schema, Stream } from "effect";
import { ChildProcess } from "effect/process";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { makeClient } from "@shivaedev/contract/bind.ts";
import { mountLive } from "@shivaedev/react/client/mountLive.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";

export const flagship = VoyageId.make(FLAGSHIP_REQUEST);
const hail = Request.make("process-hail");
const { sessionId } = identity(hail);
const entry = fileURLToPath(new URL("../../server/src/main.ts", import.meta.url));
const readiness = Schema.fromJsonString(
	Schema.Struct({ port: Schema.Int, token: Schema.String, runnerToken: Schema.String, socketPath: Schema.String }),
);
const spawn = (args: readonly string[], databaseUrl: Redacted.Redacted<string>) =>
	ChildProcess.make(process.execPath, [entry, ...args], {
		extendEnv: true,
		stderr: "inherit",
		stdout: "pipe",
		env: { ANTUMBRA_DATABASE_URL: Redacted.value(databaseUrl) },
	});
const capacityEntry: LogEntry = {
	logId: "process-log",
	cursor: 5,
	at: 0,
	event: {
		type: "CapacityObserved",
		backend: "claude",
		status: "available",
		reason: null,
		detail: null,
		observedAt: 0,
		resetsAt: null,
		utilization: null,
	},
};
const create = Effect.fn("ServerProcessStory.create")(function* () {
	const fs = yield* FileSystem.FileSystem;
	const directory = yield* fs.makeTempDirectoryScoped();
	const databaseUrl = yield* prepareDatabase(directory);
	const listen = Effect.gen(function* () {
		const child = yield* spawn(["--data", directory, "--files", join(directory, "files"), "--port", "0"], databaseUrl);
		const line = yield* Stream.runHead(Stream.splitLines(Stream.decodeText(child.stdout)));
		const { port, token, runnerToken, socketPath } = yield* Schema.decodeUnknownEffect(readiness)(Option.getOrUndefined(line));
		const options = { url: `http://127.0.0.1:${port}/rpc`, bearerToken: token, webSocketConstructor: NodeWS.layerWebSocketConstructor };
		const settings = makeClient(RoleSettingsContract.middleware(Owner), options);
		const nativeRunner = makeClient(RunnerContract, { ...options, url: `ws+unix://${socketPath}:/rpc`, bearerToken: runnerToken });
		const nativeSettings = makeClient(RoleSettingsContract.middleware(Owner), { ...options, url: `ws+unix://${socketPath}:/rpc` });
		const agents = makeClient(AgentsContract.middleware(Owner), options);
		const calls = yield* agents.client;
		const registry = AtomRegistry.make();
		yield* Effect.addFinalizer(() => Effect.sync(() => registry.dispose()));
		const release = yield* mountLive(settings.api).pipe(Effect.provideService(AtomRegistry.AtomRegistry, registry));
		yield* Effect.addFinalizer(() => Effect.sync(release));
		const releaseNative = yield* mountLive(nativeSettings.api).pipe(Effect.provideService(AtomRegistry.AtomRegistry, registry));
		yield* Effect.addFinalizer(() => Effect.sync(releaseNative));
		return {
			port,
			runnerToken,
			keepConnected: (native: boolean) =>
				Effect.gen(function* () {
					const ready = yield* Deferred.make<void>();
					yield* AtomRegistry.toStreamResult(registry, (native ? nativeSettings : settings).api.defaults.query({})).pipe(
						Stream.runForEach(() => Deferred.succeed(ready, undefined)),
						Effect.forkScoped,
					);
					yield* Deferred.await(ready);
				}),
			defaults: (credential = token) =>
				Effect.flatMap(makeClient(RoleSettingsContract.middleware(Owner), { ...options, bearerToken: credential }).client, (api) =>
					Effect.map(api["roleSettings.defaults"]({}), Option.some),
				),
			ingest: Effect.flatMap(makeClient(RunnerContract, { ...options, bearerToken: runnerToken }).client, (api) =>
				api["runner.append"]({ logId: "process-log", entries: [capacityEntry] }),
			),
			runnerSettings: Effect.flatMap(makeClient(RoleSettingsContract.middleware(Owner), { ...options, bearerToken: runnerToken }).client, (api) =>
				api["roleSettings.defaults"]({}),
			),
			nativeCursor: AtomRegistry.getResult(registry, nativeRunner.runtime.atom(nativeRunner.api.cursor.run({ logId: "process-log" }))),
			runnerCursor: Effect.flatMap(makeClient(RunnerContract, { ...options, bearerToken: runnerToken }).client, (api) =>
				api["runner.cursor"]({ logId: "process-log" }),
			),
			hail: calls["agents.hail"]({ requestId: hail, voyageId: flagship, by: "admiral" }).pipe(
				Effect.andThen(calls["agents.birthBySession"]({ sessionId })),
				Effect.map(Option.some),
			),
			stop: Effect.andThen(child.kill(), child.exitCode),
		};
	});
	return {
		listen,
		socketExists: fs.exists(join(directory, "host.sock")),
		postgresExists: fs.exists(join(directory, "postgres", "PG_VERSION")),
		legacyJournalExists: fs.exists(join(directory, "journal.db")),
		withoutDirectory: Effect.gen(function* () {
			const child = yield* spawn([], databaseUrl);
			return { announced: yield* Stream.runCollect(Stream.decodeText(child.stdout)), code: yield* child.exitCode };
		}),
	};
});
export const serverProcess = storyKit({
	name: "Antumbra server process",
	clock: "test",
	layer: NodeServices.layer,
	stages: [],
	create,
	verbs: (engine) => engine,
});
