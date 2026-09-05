import { Effect, Ref } from "effect";
import type { RulingHoldState } from "#ruling-holds/state.ts";

export const initializeRulingHolds = Effect.fn("RulingHolds.initialize")(function* (): Effect.fn.Return<RulingHoldState> {
	return yield* Ref.make<ReadonlySet<string>>(new Set());
})();
