import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

export const DebugRpc = RpcGroup.make(Rpc.make("debug.rebuildProjections", { success: Schema.Void }));
