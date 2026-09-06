import { Layer } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import type * as RpcMiddleware from "effect/unstable/rpc/RpcMiddleware";
import type * as Socket from "effect/unstable/socket/Socket";
import { serialization } from "#serialization.ts";
import { type ClientToken, layerClient, type Token } from "#token.ts";

export const transport: Layer.Layer<RpcClient.Protocol | RpcMiddleware.ForClient<Token>, never, ClientToken | Socket.Socket> = Layer.merge(
	Layer.provide(RpcClient.layerProtocolSocket(), serialization),
	layerClient,
);
