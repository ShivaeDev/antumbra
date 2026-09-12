import { createServer } from "node:http";
import { loopback } from "@antumbra/platform-rpc/endpoint.ts";
import { ClientToken } from "@antumbra/platform-rpc/token.ts";
import { transport as clientTransport } from "@antumbra/platform-rpc/transport.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { transport } from "@antumbra/server/transport.ts";
import { NodeHttpServer, NodeSocket } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Fiber, Latch, Layer, Queue, Stream } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { expect } from "vitest";
import { eventually } from "#answers.ts";
import { layer } from "#app.ts";

const server = HttpRouter.serve(transport, { disableListenLog: true }).pipe(
	Layer.provideMerge(layer),
	Layer.provideMerge(NodeHttpServer.layer(() => createServer(), { host: "127.0.0.1", port: 0 })),
);

const client = Effect.gen(function* () {
	const { address } = yield* HttpServer.HttpServer;
	if (address._tag !== "TcpAddress") return yield* Effect.die(new Error("Expected a TCP listener"));
	const ready = yield* Latch.make();
	const services = yield* Layer.build(
		clientTransport.pipe(
			Layer.provide(NodeSocket.layerWebSocket(loopback(address.port))),
			Layer.provide(Layer.succeed(RpcClient.ConnectionHooks, { onConnect: ready.open, onDisconnect: ready.close })),
		),
	);
	const calls = yield* RpcClient.make(RunnerRpc).pipe(Effect.provide(services));
	yield* ready.await;
	return calls;
});

const exchange = Effect.gen(function* () {
	const calls = yield* client;
	expect(
		(yield* Effect.flip(calls["runner.cursor"]({ logId: "log:socket" }).pipe(Effect.provideService(ClientToken, { token: "wrong-token" }))))._tag,
	).toBe("Unauthorized");

	const operations = yield* RunnerOperations;
	const reactivity = yield* Reactivity;
	const registration = { runnerId: "runner:socket", logId: "log:socket", backends: ["claude"], imageInputBackends: [] };
	const incoming = yield* calls["runner.operations"](registration).pipe(Stream.toQueue({ capacity: "unbounded" }));
	yield* eventually(reactivity.stream(["runner:connected"], operations.connected), (runners) =>
		runners.some((runner) => runner.runnerId === registration.runnerId),
	);
	const discovery = yield* Queue.take(incoming);
	if (discovery.type !== "ListModels") return yield* Effect.die(new Error(`Expected model discovery, received ${discovery.type}`));
	expect(discovery.backend).toBe("claude");
	yield* calls["runner.reply"]({
		runnerId: registration.runnerId,
		requestId: discovery.requestId,
		result: { type: "ModelsListed", backend: "claude", models: [], failure: null },
	});
	const request = { type: "Interrupt" as const, requestId: "interrupt:socket", sessionId: "session:socket" };
	const dispatched = yield* Effect.forkScoped(operations.execute(registration.runnerId, request));
	expect(yield* Queue.take(incoming)).toEqual(request);
	yield* calls["runner.reply"]({ runnerId: registration.runnerId, requestId: request.requestId, result: { type: "Accepted" } });
	expect(yield* Fiber.join(dispatched)).toEqual({ type: "Accepted" });
	expect(yield* calls["runner.cursor"]({ logId: registration.logId })).toBe(-1);
});

it.live("the production RPC endpoint authenticates runners and exchanges operations", () =>
	Effect.gen(function* () {
		const services = yield* Layer.build(server);
		yield* exchange.pipe(Effect.provide(services));
	}),
);
