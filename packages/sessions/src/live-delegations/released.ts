import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect, Ref } from "effect";
import type { LiveDelegationState } from "#live-delegations/state.ts";

export const makeReleased = (open: LiveDelegationState) =>
	Effect.fn("LiveDelegations.released")(function* (rootSessionId: string) {
		yield* Ref.update(open, (current) => {
			const next = new Map(current);
			next.delete(rootSessionId);
			return next;
		});
		const feeds = yield* DomainFeeds;
		yield* feeds.publishFleetRefresh();
	});
