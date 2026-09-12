import { extending } from "@antumbra/platform-feature/extension.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { lifecycle } from "#feature.ts";

export class LifecycleRefused extends Schema.TaggedError<LifecycleRefused>()("LifecycleRefused", { message: Schema.String }) {}

const request = { payload: Schema.Struct({ requestId: Schema.String }), success: Schema.Void, error: LifecycleRefused };
export const LifecycleRpc = extending(
	lifecycle,
	RpcGroup.make(
		Rpc.make("drain", request),
		Rpc.make("recordRestart", request),
		Rpc.make("honorRestart", request),
		Rpc.make("abandonRestart", request),
	),
);
