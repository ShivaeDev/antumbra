import { Effect, Ref } from "effect";
import type { LiveDelegationState } from "#live-delegations/state.ts";

// why: the stream is gone, so every child it was carrying is beyond reach
// whatever its row still says. The rows keep the record's own account of what
// was never ended; this only stops claiming the work is under way.
export const makeReleased = (open: LiveDelegationState) =>
	Effect.fn("liveDelegations.released")(function* (
		rootSessionId: string,
	): Effect.fn.Return<void> {
		yield* Ref.update(open, (current) => {
			const next = new Map(current);
			next.delete(rootSessionId);
			return next;
		});
	});
