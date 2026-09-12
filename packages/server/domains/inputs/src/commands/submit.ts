import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { InputFailure } from "#commands/errors.ts";
import { Draft, Image, ImageRequest, Receipt } from "#rows/content.ts";
export const SessionInputRpc = RpcGroup.make(
	Rpc.make("sessionInput.submit", { payload: Draft, success: Receipt, error: InputFailure }),
	Rpc.make("sessionInput.image", { payload: ImageRequest, success: Image, error: InputFailure }),
);
