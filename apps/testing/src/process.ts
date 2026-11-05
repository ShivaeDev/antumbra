import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { agents } from "@antumbra/domain-agents/feature.ts";
import { roleSettings } from "@antumbra/domain-role-settings/feature.ts";
import { FLAGSHIP_REQUEST, VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { client } from "@antumbra/platform-rpc/client.ts";
import { serialization } from "@antumbra/platform-rpc/serialization.ts";
import { ClientToken } from "@antumbra/platform-rpc/token.ts";
import { transport } from "@antumbra/platform-rpc/transport.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { NodeServices, NodeSocket } from "@effect/platform-node";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Deferred, Effect, FileSystem, Layer, Option, Schema, Stream } from "effect";
import { ChildProcess } from "effect/process";
import * as RpcMessage from "effect/rpc/RpcMessage";
import * as RpcSerialization from "effect/rpc/RpcSerialization";
import * as Socket from "effect/socket/Socket";

export const token = "app-level-test-token";
export const flagship = VoyageId.make(FLAGSHIP_REQUEST);
const hail = Request.make("process-hail");
const { sessionId } = identity(hail);
const entry = fileURLToPath(new URL("../../server/src/main.ts", import.meta.url));
const readiness = Schema.fromJsonString(Schema.Struct({ port: Schema.Int }));
const spawn = (args: readonly string[]) =>
	ChildProcess.make(process.execPath, [entry, ...args], {
		env: { ANTUMBRA_TOKEN: token },
		extendEnv: true,
		stderr: "inherit",
		stdout: "pipe",
	});
const dialing = (port: number, token: string) =>
	Layer.provide(transport, Layer.merge(NodeSocket.layerWebSocket(`ws://127.0.0.1:${port}/rpc`), Layer.succeed(ClientToken, { token })));
const ping = Effect.gen(function* () {
	const socket = yield* Socket.Socket;
	const parser = (yield* RpcSerialization.RpcSerialization).makeUnsafe();
	const reader = yield* socket.reader;
	const writer = yield* socket.writer;
	const encoded = parser.encode(RpcMessage.constPing);
	if (encoded === undefined) return yield* Effect.die(new Error("Ping encoding failed"));
	yield* writer.write(encoded);
	return (yield* reader.pull).flatMap((message) => parser.decode(message));
});
const create = Effect.fn("ServerProcessStory.create")(function* () {
	const fs = yield* FileSystem.FileSystem;
	const directory = yield* fs.makeTempDirectoryScoped();
	const listen = Effect.gen(function* () {
		const child = yield* spawn(["--data", directory, "--files", join(directory, "files"), "--port", "0"]);
		const line = yield* Stream.runHead(Stream.splitLines(Stream.decodeText(child.stdout)));
		const { port } = yield* Schema.decodeUnknownEffect(readiness)(Option.getOrUndefined(line));
		return {
			keepConnected: Effect.gen(function* () {
				const ready = yield* Deferred.make<void>();
				yield* Effect.flatMap(client([roleSettings]), (reach) =>
					Stream.runForEach(reach.roleSettings.defaults({}), () => Deferred.succeed(ready, undefined)),
				).pipe(Effect.provide(dialing(port, token)), Effect.forkScoped);
				yield* Deferred.await(ready);
			}),
			ping: ping.pipe(Effect.provide(Layer.merge(NodeSocket.layerWebSocket(`ws://127.0.0.1:${port}/rpc`), serialization))),
			defaults: (credential = token) =>
				Effect.flatMap(client([roleSettings]), (reach) => Stream.runHead(reach.roleSettings.defaults({}))).pipe(
					Effect.provide(dialing(port, credential)),
				),
			hail: Effect.flatMap(client([agents]), (reach) =>
				Effect.andThen(
					reach.agents.hail({ requestId: hail, voyageId: flagship, by: "admiral" }),
					Stream.runHead(reach.agents.birthBySession({ sessionId })),
				),
			).pipe(Effect.provide(dialing(port, token))),
			stop: Effect.andThen(child.kill(), child.exitCode),
		};
	});
	return {
		listen,
		postgresExists: fs.exists(join(directory, "postgres", "PG_VERSION")),
		legacyJournalExists: fs.exists(join(directory, "journal.db")),
		withoutDirectory: Effect.gen(function* () {
			const child = yield* spawn([]);
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
