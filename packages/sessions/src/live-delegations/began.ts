import { Effect, Ref } from "effect";
import type { LiveDelegationState } from "#live-delegations/state.ts";
import { withNode } from "#live-delegations/with-node.ts";

// why: an admission is not one. A node the census was first to name is a row
// the record was missing, not proof of a child at work — only the stream
// carrying its frames, or the provider's own word that a turn is under way in
// it, says that much.
export const makeBegan = (open: LiveDelegationState) =>
	Effect.fn("liveDelegations.began")(function* (
		rootSessionId: string,
		nodeSessionId: string,
	): Effect.fn.Return<void> {
		yield* Ref.update(open, (current) =>
			withNode(current, rootSessionId, nodeSessionId),
		);
	});
