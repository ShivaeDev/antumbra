import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { InputFailure } from "#commands/errors.ts";
import { Draft, Image, ImageRequest, Receipt } from "#rows/content.ts";
export const InputsRpc = RpcGroup.make(
	Rpc.make("inputs.submit", { payload: Draft, success: Receipt, error: InputFailure }),
	Rpc.make("inputs.image", { payload: ImageRequest, success: Image, error: InputFailure }),
);
