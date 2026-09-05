import { Effect, Ref } from "effect";
import type { LiveDelegationState } from "#live-delegations/state.ts";

export const makeDelegating = (open: LiveDelegationState) =>
	Effect.fn("LiveDelegations.delegating")(function* (): Effect.fn.Return<ReadonlySet<string>> {
		const current = yield* Ref.get(open);
		return new Set(current.keys());
	});
