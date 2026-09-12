import { SessionInputRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import type { Draft, ImageRequest } from "@antumbra/domain-inputs/rows/content.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { Effect } from "effect";
import * as RpcTest from "effect/unstable/rpc/RpcTest";

export const inputApi = Effect.gen(function* () {
	const calls = yield* RpcTest.makeClient(SessionInputRpc.middleware(Token));
	return {
		client: calls,
		submit: (draft: Draft) => calls["sessionInput.submit"](draft),
		image: (request: ImageRequest) => calls["sessionInput.image"](request),
	};
});
