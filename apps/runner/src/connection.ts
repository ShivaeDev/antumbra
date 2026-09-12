import { serialization } from "@antumbra/platform-rpc/serialization.ts";
import { ClientToken, layerClient } from "@antumbra/platform-rpc/token.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { NodeSocket } from "@effect/platform-node";
import { Context, Effect, Latch, Layer } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcClientError } from "effect/unstable/rpc/RpcClientError";

const makeClient = RpcClient.make(RunnerRpc);
export class RunnerClient extends Context.Service<
	RunnerClient,
	{
		readonly calls: Effect.Success<typeof makeClient>;
		readonly connected: Effect.Effect<void>;
	}
>()("@antumbra/runner/RunnerClient") {}

export const connection = (url: string, token: string) =>
	Layer.unwrap(
		Effect.gen(function* () {
			const ready = yield* Latch.make();
			const protocol = RpcClient.layerProtocolSocket({ retryTransientErrors: true }).pipe(
				Layer.provide(
					Layer.mergeAll(
						NodeSocket.layerWebSocket(url),
						serialization,
						Layer.succeed(RpcClient.ConnectionHooks, { onConnect: ready.open.pipe(Effect.asVoid), onDisconnect: ready.close.pipe(Effect.asVoid) }),
					),
				),
			);
			return Layer.effect(
				RunnerClient,
				Effect.map(makeClient, (calls) => ({ calls, connected: ready.await })),
			).pipe(Layer.provide(Layer.merge(protocol, layerClient.pipe(Layer.provide(Layer.succeed(ClientToken, { token }))))));
		}),
	);

export const connected = <A, E extends { _tag: string }, R>(effect: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const client = yield* RunnerClient;
		return yield* client.connected.pipe(
			Effect.andThen(effect),
			Effect.retry({ while: (error) => error instanceof RpcClientError && error.reason._tag !== "RpcClientDefect" }),
		);
	});
