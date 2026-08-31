import { Effect, Ref } from "effect";
import type { LiveDelegationState } from "#live-delegations/state.ts";

export const makeReleased = (open: LiveDelegationState) =>
	Effect.fn("liveDelegations.released")(function* (rootSessionId: string): Effect.fn.Return<void> {
		yield* Ref.update(open, (current) => {
			const next = new Map(current);
			next.delete(rootSessionId);
			return next;
		});
	});
