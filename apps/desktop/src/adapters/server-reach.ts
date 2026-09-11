import { backends } from "@antumbra/backends/feature.ts";
import { roleSettings } from "@antumbra/role-settings/feature.ts";
import { client } from "@antumbra/rpc/client.ts";
import { ClientToken } from "@antumbra/rpc/token.ts";
import { transport } from "@antumbra/rpc/transport.ts";
import { settings } from "@antumbra/settings-domain/feature.ts";
import { NodeSocket } from "@effect/platform-node";
import { Context, Effect, Layer, Option, Stream } from "effect";
import { ServerProcess, type Serving } from "#adapters/server-process.ts";

const connecting = client([roleSettings, backends, settings]);

export class ServerReach extends Context.Service<ServerReach, Effect.Success<typeof connecting>>()("@antumbra/desktop/ServerReach") {}

export const once = <Value, Failure>(stream: Stream.Stream<Value, Failure>): Effect.Effect<Value> =>
	Stream.runHead(stream).pipe(
		Effect.flatMap(Option.match({ onNone: () => Effect.die(new Error("the server ended a live query before it answered")), onSome: Effect.succeed })),
		Effect.orDie,
	);

export const addressOf = (serving: Effect.Effect<Serving>): Effect.Effect<string> => Effect.map(serving, ({ port }) => `ws://127.0.0.1:${port}/rpc`);

const dialing = (serving: Effect.Effect<Serving>, token: string) =>
	Layer.provide(transport, Layer.merge(NodeSocket.layerWebSocket(addressOf(serving)), Layer.succeed(ClientToken, { token })));

export const ServerReachLive: Layer.Layer<ServerReach, never, ServerProcess> = Layer.unwrap(
	Effect.gen(function* () {
		const { serving } = yield* ServerProcess;
		const { token } = yield* serving;
		return Layer.effect(ServerReach)(connecting).pipe(Layer.provide(dialing(serving, token)));
	}),
);
