import { Effect, Ref } from "effect";
import type { LiveDelegationState } from "#live-delegations/state.ts";
import { withoutNode } from "#live-delegations/without-node.ts";

export const makeEnded = (open: LiveDelegationState) =>
	Effect.fn("LiveDelegations.ended")(function* (rootSessionId: string, nodeSessionId: string): Effect.fn.Return<void> {
		yield* Ref.update(open, (current) => withoutNode(current, rootSessionId, nodeSessionId));
	});
