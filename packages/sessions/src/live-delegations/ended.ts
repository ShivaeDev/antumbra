import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect, Ref } from "effect";
import type { LiveDelegationState } from "#live-delegations/state.ts";
import { withoutNode } from "#live-delegations/without-node.ts";

export const makeEnded = (open: LiveDelegationState) =>
	Effect.fn("LiveDelegations.ended")(function* (rootSessionId: string, nodeSessionId: string) {
		yield* Ref.update(open, (current) => withoutNode(current, rootSessionId, nodeSessionId));
		const feeds = yield* DomainFeeds;
		yield* feeds.publishFleetRefresh();
	});
