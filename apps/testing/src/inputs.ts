import { InputsRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import { Owner } from "@antumbra/platform-access/policy.ts";
import type { Draft, ImageRequest } from "@antumbra/platform-vocabulary/inputs.ts";
import { Effect } from "effect";
import * as RpcTest from "effect/rpc/RpcTest";

export const inputApi = Effect.gen(function* () {
	const calls = yield* RpcTest.makeClient(InputsRpc.middleware(Owner));
	return {
		client: calls,
		submit: (draft: Draft) => calls["inputs.submit"](draft),
		image: (request: ImageRequest) => calls["inputs.image"](request),
	};
});
