import { createServer } from "node:http";
import { path as rpcPath } from "@antumbra/platform-rpc/endpoint.ts";
import { serialization } from "@antumbra/platform-rpc/serialization.ts";
import { ServerToken } from "@antumbra/platform-rpc/token.ts";
import { DataDirectory } from "@antumbra/server-journal/database.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, FileSystem, Layer, Logger, Path } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as RpcServer from "effect/unstable/rpc/RpcServer";
import { artifactFiles } from "#adapters/artifacts/layer.ts";
import { ArtifactStorage } from "#adapters/artifacts/storage.ts";
import { Files } from "#files.ts";
import { checkFixture } from "#fixture/check.ts";
import { capturedLogs } from "#fixture/logs.ts";
import { fixtureApplication, fixtureRpc } from "#fixture.ts";
import { options } from "#options.ts";

const main = Effect.gen(function* () {
	const settings = yield* options(process.argv);
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const logsIndex = process.argv.indexOf("--logs");
	const logs = process.argv[logsIndex + 1];
	if (logsIndex < 0 || logs === undefined) return yield* Effect.fail(new Error("--logs must name the extracted fixture directory"));
	yield* fs.access(path.join(settings.directory, "journal.db"));
	const storage = Journal.file().pipe(Layer.provide(Layer.succeed(DataDirectory, { path: settings.directory })));
	const artifacts = artifactFiles.pipe(Layer.provide(Layer.succeed(ArtifactStorage, { root: path.join(settings.files, "artifacts") })));
	const app = fixtureApplication.pipe(
		Layer.provideMerge(Layer.mergeAll(storage, artifacts, capturedLogs(logs))),
		Layer.provideMerge(Layer.succeed(Files, { root: settings.files })),
		Layer.provide(Layer.succeed(ServerToken, { token: settings.token })),
	);
	if (process.argv.includes("--check")) {
		yield* Console.log("Checking fixture storage and captured content...");
		const result = yield* checkFixture.pipe(Effect.provide(app));
		return yield* Console.log(JSON.stringify({ checked: result }));
	}
	const transport = RpcServer.layer(fixtureRpc).pipe(
		Layer.provide(RpcServer.layerProtocolWebsocket({ path: rpcPath })),
		Layer.provide(serialization),
	);
	const listener = HttpRouter.serve(transport, { disableListenLog: true }).pipe(
		Layer.provideMerge(app),
		Layer.provideMerge(NodeHttpServer.layer(() => createServer(), { host: "127.0.0.1", port: settings.port })),
	);
	yield* Effect.gen(function* () {
		const server = yield* HttpServer.HttpServer;
		if (server.address._tag !== "TcpAddress") return yield* Effect.die(server.address);
		yield* Console.log(JSON.stringify({ port: server.address.port }));
		yield* Effect.never;
	}).pipe(Effect.provide(listener));
}).pipe(Effect.provide(NodeServices.layer), Effect.provide(Layer.succeed(Logger.LogToStderr, true)));

NodeRuntime.runMain(main);
