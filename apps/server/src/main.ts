import { createServer } from "node:http";
import { makeGitHubHost } from "@antumbra/edge-github/host.ts";
import { ChangeHosts } from "@antumbra/platform-change-host/port.ts";
import { ServerToken } from "@antumbra/platform-rpc/token.ts";
import { DataDirectory } from "@antumbra/server-journal/database.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node";
import { Cause, Console, Effect, Exit, FileSystem, Layer, Logger, Path, type Runtime } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { artifactFiles } from "#adapters/artifacts/layer.ts";
import { ArtifactStorage } from "#adapters/artifacts/storage.ts";
import { ghProcessLayer } from "#adapters/github/process.ts";
import { application } from "#application.ts";
import { Files } from "#files.ts";
import { type Options, options } from "#options.ts";
import { ServerRuntime } from "#runtime.ts";
import { transport } from "#transport.ts";

const HOST = "127.0.0.1";

const journal = (directory: string) => Journal.file().pipe(Layer.provide(Layer.succeed(DataDirectory, { path: directory })));

const hosts = Layer.effect(
	ChangeHosts,
	Effect.map(makeGitHubHost({ executable: "gh" }), (host) => [host]),
).pipe(Layer.provide(ghProcessLayer));
const artifacts = Layer.unwrap(
	Effect.gen(function* () {
		const files = yield* Files;
		const path = yield* Path.Path;
		return artifactFiles.pipe(Layer.provide(Layer.succeed(ArtifactStorage, { root: path.join(files.root, "artifacts") })));
	}),
);
const listener = (settings: Options) => {
	const app = application.pipe(
		Layer.provideMerge(Layer.mergeAll(journal(settings.directory), hosts, artifacts)),
		Layer.provideMerge(Layer.succeed(Files, { root: settings.files })),
	);
	return HttpRouter.serve(transport, { disableListenLog: true }).pipe(
		Layer.provideMerge(app),
		Layer.provide(Layer.succeed(ServerToken, { token: settings.token })),
		Layer.provideMerge(NodeHttpServer.layer(() => createServer(), { host: HOST, port: settings.port })),
		Layer.orDie,
	);
};

const announce = (address: HttpServer.Address) =>
	address._tag === "TcpAddress" ? Console.log(JSON.stringify({ port: address.port })) : Effect.die(address);

const listen = Effect.gen(function* () {
	const server = yield* HttpServer.HttpServer;
	yield* announce(server.address);
	return yield* (yield* ServerRuntime).await;
});

const main = Effect.gen(function* () {
	const settings = yield* options(process.argv);
	const fs = yield* FileSystem.FileSystem;
	yield* fs.makeDirectory(settings.directory, { recursive: true });
	yield* fs.makeDirectory(settings.files, { recursive: true });
	return yield* Effect.provide(listen, listener(settings));
}).pipe(Effect.provide(NodeServices.layer));

const teardown: Runtime.Teardown = (exit, onExit) => {
	if (Exit.isSuccess(exit) || Cause.hasInterruptsOnly(exit.cause)) {
		return onExit(0);
	}
	return onExit(Cause.hasFails(exit.cause) ? 2 : 1);
};

const reported = Effect.tapCause(main, (cause) => (Cause.hasInterruptsOnly(cause) ? Effect.void : Effect.logError(cause)));

NodeRuntime.runMain(Effect.provide(reported, Layer.succeed(Logger.LogToStderr, true)), { disableErrorReporting: true, teardown });
