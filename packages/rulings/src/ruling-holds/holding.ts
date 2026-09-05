import { Effect, Ref, type Scope } from "effect";
import type { RulingHoldState } from "#ruling-holds/state.ts";

const without = (current: ReadonlySet<string>, rulingId: string): ReadonlySet<string> => {
	const next = new Set(current);
	next.delete(rulingId);
	return next;
};

export const makeHolding = (held: RulingHoldState) =>
	Effect.fn("RulingHolds.holding")(function* (rulingId: string): Effect.fn.Return<void, never, Scope.Scope> {
		yield* Effect.acquireRelease(
			Ref.update(held, (current) => new Set(current).add(rulingId)),
			() => Ref.update(held, (current) => without(current, rulingId)),
		);
	});
