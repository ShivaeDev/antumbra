import { createServer } from "node:http";
import { group } from "@antumbra/platform-rpc/group.ts";
import { serialization } from "@antumbra/platform-rpc/serialization.ts";
import { ServerToken } from "@antumbra/platform-rpc/token.ts";
import { DataDirectory } from "@antumbra/server-journal/database.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Cause, Console, Effect, Exit, Layer, Logger, type Runtime } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as RpcServer from "effect/unstable/rpc/RpcServer";
import { application, definition } from "#application.ts";
import { options } from "#options.ts";

const HOST = "127.0.0.1";
const PATH = "/rpc";

const journal = (directory: string) => Journal.file().pipe(Layer.provide(Layer.succeed(DataDirectory, { path: directory })));

const rpc = RpcServer.layer(group(definition.features)).pipe(
	Layer.provide(application),
	Layer.provide(RpcServer.layerProtocolWebsocket({ path: PATH })),
	Layer.provide(serialization),
);

const listener = (directory: string, token: string) =>
	HttpRouter.serve(rpc, { disableListenLog: true }).pipe(
		Layer.provide(journal(directory)),
		Layer.provide(Layer.succeed(ServerToken, { token })),
		Layer.provideMerge(NodeHttpServer.layer(() => createServer(), { host: HOST, port: 0 })),
		Layer.orDie,
	);

const announce = (address: HttpServer.Address) =>
	address._tag === "TcpAddress" ? Console.log(JSON.stringify({ port: address.port })) : Effect.die(address);

const listen = Effect.gen(function* () {
	const server = yield* HttpServer.HttpServer;
	yield* announce(server.address);
	return yield* Effect.never;
});

const main = Effect.flatMap(options(process.argv), ({ directory, token }) => Effect.provide(listen, listener(directory, token)));

const teardown: Runtime.Teardown = (exit, onExit) => {
	if (Exit.isSuccess(exit) || Cause.hasInterruptsOnly(exit.cause)) {
		return onExit(0);
	}
	return onExit(Cause.hasFails(exit.cause) ? 2 : 1);
};

const reported = Effect.tapCause(main, (cause) => (Cause.hasInterruptsOnly(cause) ? Effect.void : Effect.logError(cause)));

NodeRuntime.runMain(Effect.provide(reported, Layer.succeed(Logger.LogToStderr, true)), { disableErrorReporting: true, teardown });
