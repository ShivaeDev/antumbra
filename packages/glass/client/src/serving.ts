import { Credential } from "@antumbra/platform-access/credential.ts";
import { transport } from "@antumbra/platform-access/transport.ts";
import { Context, Effect, Layer } from "effect";
import type * as RpcClient from "effect/rpc/RpcClient";
import * as Socket from "effect/socket/Socket";

export interface Serving {
	readonly port: number;
	readonly token: string;
}

export type Reach = Effect.Effect<Serving>;

export class Connection extends Context.Service<Connection, Reach>()("@antumbra/glass/Connection") {}
export type Dialing = RpcClient.Protocol | Connection;

export const addressOf = (reach: Reach): Effect.Effect<string> => Effect.map(reach, ({ port }) => `ws://127.0.0.1:${port}/rpc?auth=frame`);

export const dialing = (reach: Reach): Layer.Layer<Dialing> =>
	Layer.merge(
		Layer.succeed(Connection, reach),
		Layer.provide(
			transport,
			Layer.merge(
				Layer.provide(Socket.layerWebSocket(addressOf(reach)), Socket.layerWebSocketConstructorGlobal),
				Layer.effect(Credential)(Effect.map(reach, ({ token }) => ({ token }))),
			),
		),
	);
