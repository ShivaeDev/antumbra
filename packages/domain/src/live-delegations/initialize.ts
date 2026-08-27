import { Effect, Ref } from "effect";
import type { LiveDelegationState } from "#live-delegations/state.ts";

export const initializeLiveDelegations = Effect.fn(
	"liveDelegations.initialize",
)(function* (): Effect.fn.Return<LiveDelegationState> {
	return yield* Ref.make<ReadonlyMap<string, ReadonlySet<string>>>(new Map());
})();
