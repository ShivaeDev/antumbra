import { Token } from "@antumbra/platform-rpc/token.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

export class LifecycleRefused extends Schema.TaggedErrorClass<LifecycleRefused>()("LifecycleRefused", { message: Schema.String }) {}

const request = { payload: Schema.Struct({ requestId: Schema.String }), success: Schema.Void, error: LifecycleRefused };
export const LifecycleRpc = RpcGroup.make(
	Rpc.make("lifecycle.drain", request),
	Rpc.make("lifecycle.recordRestart", request),
	Rpc.make("lifecycle.honorRestart", request),
	Rpc.make("lifecycle.abandonRestart", request),
).middleware(Token);
