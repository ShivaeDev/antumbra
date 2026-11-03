import type { Layer } from "effect";
import * as RpcSerialization from "effect/rpc/RpcSerialization";

export const serialization: Layer.Layer<RpcSerialization.RpcSerialization> = RpcSerialization.layerJson;
