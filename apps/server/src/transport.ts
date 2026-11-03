import { path } from "@antumbra/platform-rpc/endpoint.ts";
import { serialization } from "@antumbra/platform-rpc/serialization.ts";
import { Layer } from "effect";
import * as RpcServer from "effect/rpc/RpcServer";
import { rpc } from "#rpc.ts";

export const transport = RpcServer.layer(rpc).pipe(Layer.provide(RpcServer.layerProtocolWebsocket({ path })), Layer.provide(serialization));
