import { Effect, Ref } from "effect";
import type { LiveDelegationState } from "#live-delegations/state.ts";
import { withNode } from "#live-delegations/with-node.ts";

export const makeBegan = (open: LiveDelegationState) =>
	Effect.fn("LiveDelegations.began")(function* (rootSessionId: string, nodeSessionId: string): Effect.fn.Return<void> {
		yield* Ref.update(open, (current) => withNode(current, rootSessionId, nodeSessionId));
	});
