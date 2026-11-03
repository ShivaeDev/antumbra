import { Schema } from "effect";
import * as Rpc from "effect/rpc/Rpc";
import * as RpcGroup from "effect/rpc/RpcGroup";

export const DebugRpc = RpcGroup.make(Rpc.make("debug.rebuildProjections", { success: Schema.Void }));
