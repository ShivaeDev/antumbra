import type { Token } from "@antumbra/platform-rpc/token.ts";
import { ClientToken } from "@antumbra/platform-rpc/token.ts";
import { transport } from "@antumbra/platform-rpc/transport.ts";
import { Effect, Layer } from "effect";
import type * as RpcClient from "effect/unstable/rpc/RpcClient";
import type * as RpcMiddleware from "effect/unstable/rpc/RpcMiddleware";
import * as Socket from "effect/unstable/socket/Socket";

export interface Serving {
	readonly port: number;
	readonly token: string;
}

export type Reach = Effect.Effect<Serving>;

export const addressOf = (reach: Reach): Effect.Effect<string> => Effect.map(reach, ({ port }) => `ws://127.0.0.1:${port}/rpc`);

export const dialing = (reach: Reach): Layer.Layer<RpcClient.Protocol | RpcMiddleware.ForClient<Token>> =>
	Layer.provide(
		transport,
		Layer.merge(
			Layer.provide(Socket.layerWebSocket(addressOf(reach)), Socket.layerWebSocketConstructorGlobal),
			Layer.effect(ClientToken)(Effect.map(reach, ({ token }) => ({ token }))),
		),
	);
