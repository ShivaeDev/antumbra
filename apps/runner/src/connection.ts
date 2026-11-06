import { serialization } from "@antumbra/platform-access/serialization.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import * as NodeWS from "@effect/platform-node/NodeWS";
import { Context, Effect, Latch, Layer, Schedule } from "effect";
import * as RpcClient from "effect/rpc/RpcClient";
import { RpcClientError } from "effect/rpc/RpcClientError";
import * as Socket from "effect/socket/Socket";
import { authenticateSocket } from "@shivaedev/contract/socketAuthentication.ts";

const makeClient = RpcClient.make(RunnerRpc);
const authenticatedSocket = (url: string, token: string) =>
	Layer.effect(Socket.Socket, authenticateSocket(token)).pipe(
		Layer.provide(Layer.effect(Socket.Socket, Socket.makeWebSocket(`${url}?auth=frame`)).pipe(Layer.provide(NodeWS.layerWebSocketConstructor))),
	);
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
						authenticatedSocket(url, token),
						serialization,
						Layer.succeed(RpcClient.ConnectionHooks, { onConnect: ready.open.pipe(Effect.asVoid), onDisconnect: ready.close.pipe(Effect.asVoid) }),
					),
				),
			);
			return Layer.effect(
				RunnerClient,
				Effect.map(makeClient, (calls) => ({ calls, connected: ready.await })),
			).pipe(Layer.provide(protocol));
		}),
	);

export const connected = <A, E extends { _tag: string }, R>(effect: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const client = yield* RunnerClient;
		return yield* client.connected.pipe(
			Effect.andThen(effect),
			Effect.retry({
				schedule: Schedule.spaced("1 second"),
				while: (error) => error instanceof RpcClientError && error.reason._tag !== "RpcClientDefect",
			}),
		);
	});
