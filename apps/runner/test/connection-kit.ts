import type { hosted } from "@antumbra/app-testing/hosted.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Deferred, Effect, Layer } from "effect";
import { RpcClientError } from "effect/rpc/RpcClientError";
import { SocketOpenError } from "effect/socket/Socket";
import * as TestClock from "effect/testing/TestClock";
import { connected, connection, RunnerClient } from "#connection.ts";

type Host = Effect.Success<ReturnType<typeof hosted>>;

const runner = (host: Host) =>
	connected(RunnerClient.use(({ calls }) => calls["runner.cursor"]({ logId: "runner:production-adapter" }))).pipe(
		Effect.provide(connection(`ws+unix://${host.socketPath}:/rpc`, host.machineToken)),
	);

const recovering = Effect.fn("RunnerConnectionStory.recovering")(function* (host: Host) {
	let unavailable = true;
	const failed = yield* Deferred.make<void>();
	const exchange = Effect.suspend(() => {
		if (!unavailable) return Effect.succeed("reconnected");
		unavailable = false;
		return Deferred.succeed(failed, undefined).pipe(
			Effect.andThen(Effect.fail(new RpcClientError({ reason: new SocketOpenError({ kind: "Unknown", cause: "connection lost" }) }))),
		);
	});
	const response = yield* Deferred.make<string, RpcClientError>();
	yield* connected(exchange).pipe(
		Effect.provide(connection(`ws+unix://${host.socketPath}:/rpc`, host.machineToken)),
		(exchange) => Deferred.complete(response, exchange),
		Effect.forkScoped,
	);
	yield* Deferred.await(failed);
	yield* TestClock.adjust("0 millis");
	return {
		advance: (millis: number) => TestClock.adjust(millis),
		state: Effect.map(Deferred.isDone(response), (done) => (done ? "reconnected" : "waiting")),
		result: Deferred.await(response),
	};
});

export const nativeRunner = storyKit({
	name: "Native runner",
	clock: "test",
	layer: Layer.empty,
	stages: [],
	create: () => Effect.succeed({ runner, recovering }),
	verbs: (engine) => engine,
});
