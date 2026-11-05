import { createServer } from "node:http";
import { replayPostgresFixture } from "@antumbra/legacy-fixture/replay.ts";
import { LegacyModel, legacyModel } from "@antumbra/legacy-fixture/v1/model.ts";
import { path as rpcPath } from "@antumbra/platform-rpc/endpoint.ts";
import { serialization } from "@antumbra/platform-rpc/serialization.ts";
import { ServerToken } from "@antumbra/platform-rpc/token.ts";
import { legacySource } from "@antumbra/server/fixture/source.ts";
import { NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, FileSystem, Layer, Logger, Path } from "effect";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import * as RpcServer from "effect/rpc/RpcServer";
import { artifactFiles } from "#adapters/artifacts/layer.ts";
import { ArtifactStorage } from "#adapters/artifacts/storage.ts";
import { definition } from "#definition.ts";
import { Files } from "#files.ts";
import { checkFixture } from "#fixture/check.ts";
import { capturedLogs } from "#fixture/logs.ts";
import { fixtureApplication, fixtureRpc } from "#fixture.ts";
import { options } from "#options.ts";
import { storage } from "#storage.ts";

const main = Effect.gen(function* () {
	const settings = yield* options(process.argv);
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const logsIndex = process.argv.indexOf("--logs");
	const logs = process.argv[logsIndex + 1];
	if (logsIndex < 0 || logs === undefined) return yield* Effect.fail(new Error("--logs must name the extracted fixture directory"));
	yield* fs.access(path.join(settings.directory, "journal.db"));
	const database = storage(settings.directory);
	const artifacts = artifactFiles.pipe(Layer.provide(Layer.succeed(ArtifactStorage, { root: path.join(settings.files, "artifacts") })));
	const app = fixtureApplication.pipe(
		Layer.provideMerge(legacySource),
		Layer.provideMerge(Layer.succeed(LegacyModel, legacyModel(definition))),
		Layer.provideMerge(Layer.mergeAll(database, artifacts, capturedLogs(logs))),
		Layer.provideMerge(Layer.succeed(Files, { root: settings.files })),
		Layer.provide(Layer.succeed(ServerToken, { token: settings.token })),
	);
	const services = yield* Layer.build(app);
	const marker = path.join(settings.directory, "postgres-fixture-replayed");
	if (!(yield* fs.exists(marker))) {
		yield* replayPostgresFixture(path.join(settings.directory, "journal.db")).pipe(Effect.provideContext(services));
		yield* fs.writeFileString(marker, "1");
	}
	if (process.argv.includes("--check")) {
		yield* Console.log("Checking fixture storage and captured content...");
		const result = yield* checkFixture.pipe(Effect.provideContext(services));
		return yield* Console.log(JSON.stringify({ checked: result }));
	}
	const transport = RpcServer.layer(fixtureRpc).pipe(
		Layer.provide(RpcServer.layerProtocolWebsocket({ path: rpcPath })),
		Layer.provide(serialization),
	);
	const listener = HttpRouter.serve(transport, { disableListenLog: true }).pipe(
		Layer.provideMerge(Layer.succeedContext(services)),
		Layer.provideMerge(NodeHttpServer.layer(() => createServer(), { host: "127.0.0.1", port: settings.port, disablePreemptiveShutdown: true })),
	);
	yield* Effect.gen(function* () {
		const server = yield* HttpServer.HttpServer;
		if (server.address._tag !== "InetAddressV4") return yield* Effect.die(server.address);
		yield* Console.log(JSON.stringify({ port: server.address.port }));
		yield* Effect.never;
	}).pipe(Effect.provide(listener));
}).pipe(Effect.provide(NodeServices.layer), Effect.provide(Layer.succeed(Logger.LogToStderr, true)), Effect.scoped);

NodeRuntime.runMain(main);
