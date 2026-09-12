import { extending } from "@antumbra/platform-feature/extension.ts";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { InputFailure } from "#commands/errors.ts";
import { inputs } from "#feature.ts";
import { Draft, Image, ImageRequest, Receipt } from "#rows/content.ts";
export const InputsRpc = extending(
	inputs,
	RpcGroup.make(
		Rpc.make("submit", { payload: Draft, success: Receipt, error: InputFailure }),
		Rpc.make("image", { payload: ImageRequest, success: Image, error: InputFailure }),
	),
);
