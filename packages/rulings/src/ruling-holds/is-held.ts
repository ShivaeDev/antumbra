import { Effect, Ref } from "effect";
import type { RulingHoldState } from "#ruling-holds/state.ts";

export const makeIsHeld = (held: RulingHoldState) =>
	Effect.fn("RulingHolds.isHeld")(function* (rulingId: string): Effect.fn.Return<boolean> {
		return (yield* Ref.get(held)).has(rulingId);
	});
