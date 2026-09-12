import { Token } from "@antumbra/platform-rpc/token.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

export class LifecycleRefused extends Schema.TaggedError<LifecycleRefused>()("LifecycleRefused", { message: Schema.String }) {}

const request = { payload: Schema.Struct({ requestId: Schema.String }), success: Schema.Void, error: LifecycleRefused };
export const RestartRpc = RpcGroup.make(
	Rpc.make("restart.drain", request),
	Rpc.make("restart.record", request),
	Rpc.make("restart.honor", request),
	Rpc.make("restart.abandon", request),
).middleware(Token);
