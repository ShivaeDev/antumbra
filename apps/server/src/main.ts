import { NodeCrypto, NodeRuntime, NodeServices } from "@effect/platform-node";
import { SessionPolicy } from "@shivaedev/identity/server/SessionPolicy.ts";
import { appHost } from "@shivaedev/server/appHost.ts";
import { Cause, Config, Console, Effect, Exit, FileSystem, Layer, Logger, Path, Redacted, type Runtime } from "effect";
import * as HttpServer from "effect/http/HttpServer";
import { artifactFiles } from "#adapters/artifacts/layer.ts";
import { ArtifactStorage } from "#adapters/artifacts/storage.ts";
import { githubHosts } from "#adapters/github/hosts.ts";
import { application } from "#application.ts";
import { Files } from "#files.ts";
import { identity } from "#identity.ts";
import { options } from "#options.ts";
import { rpc } from "#rpc.ts";
import { ServerRuntime } from "#runtime.ts";
import { storage } from "#storage.ts";

const artifacts = Layer.unwrap(
	Effect.gen(function* () {
		const files = yield* Files;
		const path = yield* Path.Path;
		return artifactFiles.pipe(Layer.provide(Layer.succeed(ArtifactStorage, { root: path.join(files.root, "artifacts") })));
	}),
);

const main = Effect.gen(function* () {
	const settings = yield* options(process.argv);
	const fs = yield* FileSystem.FileSystem;
	yield* fs.makeDirectory(settings.directory, { recursive: true });
	yield* fs.makeDirectory(settings.files, { recursive: true });
	const database = yield* Layer.build(storage(yield* Config.Redacted("ANTUMBRA_DATABASE_URL")));
	const origin = yield* Config.String("ANTUMBRA_RENDERER_ORIGIN").pipe(Config.withDefault(undefined));
	const origins = origin === undefined ? [] : [origin];
	const local = yield* identity(settings.directory, origins).pipe(Effect.provideContext(database));
	const app = application.pipe(
		Layer.provideMerge(Layer.mergeAll(githubHosts, artifacts)),
		Layer.provideMerge(Layer.succeed(Files, { root: settings.files })),
	);
	const socketPath = (yield* Path.Path).join(settings.directory, "host.sock");
	const host = appHost({
		group: rpc,
		handlers: Layer.empty,
		services: app,
		sessions: Layer.succeed(SessionPolicy, local.sessions),
		nativeOrigins: origins,
		config: { host: "127.0.0.1", port: settings.port, socketPath, disablePreemptiveShutdown: true },
	}).pipe(Layer.provideMerge(Layer.succeedContext(database)));
	return yield* Effect.gen(function* () {
		const { address } = yield* HttpServer.HttpServer;
		if (address._tag !== "InetAddressV4") return yield* Effect.die(address);
		yield* Console.log(JSON.stringify({ port: address.port, socketPath, token: Redacted.value(local.token), runnerToken: local.runnerToken }));
		return yield* (yield* ServerRuntime).await;
	}).pipe(Effect.provide(host));
}).pipe(Effect.provide(NodeServices.layer), Effect.provide(NodeCrypto.layer), Effect.scoped);

const teardown: Runtime.Teardown = (exit, onExit) => {
	if (Exit.isSuccess(exit) || Cause.hasInterruptsOnly(exit.cause)) {
		return onExit(0);
	}
	return onExit(Cause.hasFails(exit.cause) ? 2 : 1);
};

const reported = Effect.tapCause(main, (cause) => (Cause.hasInterruptsOnly(cause) ? Effect.void : Effect.logError(cause)));

NodeRuntime.runMain(Effect.provide(reported, Layer.succeed(Logger.LogToStderr, true)), { disableErrorReporting: true, teardown });
