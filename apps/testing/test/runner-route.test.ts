import { createServer } from "node:http";
import { setCount } from "@antumbra/domain-settings/commands/set-count.ts";
import { settings } from "@antumbra/domain-settings/feature.ts";
import { loopback } from "@antumbra/platform-rpc/endpoint.ts";
import { group } from "@antumbra/platform-rpc/group.ts";
import { ClientToken } from "@antumbra/platform-rpc/token.ts";
import { transport as clientTransport } from "@antumbra/platform-rpc/transport.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { transport } from "@antumbra/server/transport.ts";
import { NodeHttpServer, NodeSocket } from "@effect/platform-node";
import { Effect, Fiber, Latch, Layer, Queue, Stream } from "effect";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import { Reactivity } from "effect/reactivity/Reactivity";
import * as RpcClient from "effect/rpc/RpcClient";
import { expect } from "vitest";
import { eventually } from "#answers.ts";
import { layer } from "#app.ts";
import { it } from "#entry.ts";

const server = HttpRouter.serve(transport, { disableListenLog: true }).pipe(
	Layer.provideMerge(layer),
	Layer.provideMerge(NodeHttpServer.layer(() => createServer(), { host: "127.0.0.1", port: 0 })),
);

const client = Effect.gen(function* () {
	const { address } = yield* HttpServer.HttpServer;
	if (address._tag !== "InetAddressV4") return yield* Effect.die(new Error("Expected a TCP listener"));
	const ready = yield* Latch.make();
	const services = yield* Layer.build(
		clientTransport.pipe(
			Layer.provide(NodeSocket.layerWebSocket(loopback(address.port))),
			Layer.provide(Layer.succeed(RpcClient.ConnectionHooks, { onConnect: ready.open, onDisconnect: ready.close })),
		),
	);
	const calls = yield* RpcClient.make(RunnerRpc.merge(group([settings]))).pipe(Effect.provide(services));
	yield* ready.await;
	return calls;
});

const exchange = Effect.gen(function* () {
	const calls = yield* client;
	expect(
		(yield* Effect.flip(calls["runner.cursor"]({ logId: "log:socket" }).pipe(Effect.provideService(ClientToken, { token: "wrong-token" }))))._tag,
	).toBe("Unauthorized");

	const refusal = yield* Effect.flip(
		calls["settings.setCount"]({ requestId: Request.make("rejected:socket"), key: "maxParallelSessions", count: 100 }),
	);
	expect(refusal).toBeInstanceOf(setCount.Rejection.OutOfRange);
	expect(refusal).toMatchObject({ _tag: "OutOfRange", field: "count" });
	expect(yield* calls["settings.setCount"]({ requestId: Request.make("accepted:socket"), key: "maxParallelSessions", count: 9 })).toBeGreaterThan(0);

	const operations = yield* RunnerOperations;
	const reactivity = yield* Reactivity;
	const registration = { runnerId: "runner:socket", logId: "log:socket", backends: ["claude"], imageInputBackends: [] };
	yield* Effect.scoped(
		Effect.gen(function* () {
			const incoming = yield* calls["runner.operations"](registration).pipe(Stream.toQueue({ capacity: "unbounded" }));
			yield* eventually(
				reactivity.stream(["runner:connected"], operations.connected),
				(runners) => runners.some((runner) => runner.runnerId === registration.runnerId),
				"the runner to appear as connected",
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
		}),
	);
	yield* eventually(
		reactivity.stream(["runner:connected"], operations.connected),
		(runners) => runners.every((runner) => runner.runnerId !== registration.runnerId),
		"the interrupted RPC stream to release the runner registration",
	);
});

it.app("the production RPC endpoint authenticates runners and exchanges operations", function* () {
	const services = yield* Layer.build(server);
	yield* exchange.pipe(Effect.provide(services));
});
