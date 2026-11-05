import { Owner, owner, roles } from "@antumbra/platform-access/policy.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { application } from "@antumbra/server/application.ts";
import { rpc } from "@antumbra/server/rpc.ts";
import { Backends } from "@antumbra/server-backends/service.ts";
import { SettingsContract } from "@antumbra/server-settings/contract.ts";
import { NodeServices, NodeSocket } from "@effect/platform-node";
import { makeClient } from "@shivaedev/contract/bind.ts";
import { LiveServer } from "@shivaedev/contract/LiveServer.ts";
import { trustedOrigins } from "@shivaedev/identity/server/adapters/trustedOrigins.ts";
import { localOwner } from "@shivaedev/identity/server/localOwner.ts";
import { SessionPolicy } from "@shivaedev/identity/server/SessionPolicy.ts";
import { appHost } from "@shivaedev/server/appHost.ts";
import { ConfigProvider, Context, Effect, Exit, FileSystem, Layer, Path, Redacted, Scope } from "effect";
import { HttpServer } from "effect/http";
import { Reactivity } from "effect/reactivity/Reactivity";
import { SqlClient } from "effect/sql";
import { ports } from "#app.ts";
import { credentials } from "#hosted/credentials.ts";
import { rollbackCount } from "#hosted/rollback-count.ts";
import { window } from "#hosted/window.ts";
import { inputSession } from "#test-support/input-fixture.ts";

export const hosted = Effect.fn("ApplicationStory.hosted")(function* () {
	const sql = yield* SqlClient.SqlClient;
	const reactivity = yield* Reactivity;
	const dependencies = Context.make(SqlClient.SqlClient, sql).pipe(Context.add(Reactivity, reactivity));
	const local = yield* localOwner({ owner, roles });
	const machine = yield* local.machines.issue({ name: "Story runner", scope: "runner" });
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const root = yield* fs.makeTempDirectoryScoped();
	const socketPath = path.join(root, "host.sock");
	const tracePath = path.join(root, "traces.db");
	const host = appHost({
		group: rpc,
		handlers: Layer.empty,
		services: Layer.fresh(application).pipe(Layer.provideMerge(ports)),
		sessions: Layer.succeed(SessionPolicy, { ...local.sessions, origin: trustedOrigins({ allow: [], missing: "allow", sameOrigin: {} }) }),
		config: { host: "127.0.0.1", port: 0, socketPath },
	}).pipe(
		Layer.provideMerge(LiveServer.layer),
		Layer.provide(NodeServices.layer),
		Layer.provide(
			ConfigProvider.layer(
				ConfigProvider.fromUnknown({
					NODE_ENV: "development",
					PLATFORM_TRACE_STORE: tracePath,
					PLATFORM_TRACE_INDEXED_ATTRIBUTES: "sessionId,agentId,intentId,pieceId",
				}),
			),
		),
	);
	const scope = yield* Scope.fork(yield* Effect.scope);
	const services = yield* Layer.build(host).pipe(Effect.provideContext(Context.add(dependencies, Scope.Scope, scope)));
	const { address } = Context.get(services, HttpServer.HttpServer);
	if (address._tag !== "InetAddressV4") return yield* Effect.die(new Error("Expected the host TCP listener"));
	const options = {
		url: `http://127.0.0.1:${address.port}/rpc`,
		bearerToken: Redacted.value(local.token),
		webSocketConstructor: NodeSocket.layerWebSocketConstructor,
	};
	const clients = yield* Scope.fork(yield* Effect.scope);
	const calls = yield* makeClient(SettingsContract.middleware(Owner), {
		...options,
		group: SettingsContract.middleware(Owner).merge(RunnerRpc),
	}).client.pipe(Scope.provide(clients));
	return {
		inputSession: () => inputSession().pipe(Effect.provideContext(services)),
		capability: (imageInput: boolean) =>
			Backends.use((service) =>
				service.observeCapability({ requestId: Request.make(`capability:${imageInput}`), backend: "claude", imageInput }),
			).pipe(Effect.provideContext(services)),
		traces: fs.readFile(tracePath).pipe(Effect.map((bytes) => new TextDecoder().decode(bytes))),
		traceRequest: Effect.gen(function* () {
			const span = yield* Effect.currentSpan;
			yield* Effect.exit(calls["settings.setCount"]({ requestId: Request.make("traced-refusal"), key: "maxParallelSessions", count: 100 }));
			return span.traceId;
		}).pipe(Effect.withSpan("HostStory.request")),
		credentials: (token?: string) => credentials(options.url, token).pipe(Scope.provide(clients)),
		unixCredentials: (token?: string) => credentials(`ws+unix://${socketPath}:/rpc`, token).pipe(Scope.provide(clients)),
		stop: Scope.close(clients, Exit.void).pipe(Effect.andThen(Scope.close(scope, Exit.void))),
		socketExists: fs.exists(socketPath),
		window: () => window({ port: address.port, token: Redacted.value(local.token) }),
		rollbackCount: (count: number) => rollbackCount(count).pipe(Effect.provideContext(services)),
		calls,
		options,
		socketPath,
		machineToken: Redacted.value(machine.token),
		revoke: local.machines.revoke(machine.id),
		operations: Context.get(services, RunnerOperations),
		reactivity,
	};
});
