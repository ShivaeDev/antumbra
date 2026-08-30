import { Effect, Ref, type Scope } from "effect";
import type { RulingHoldState } from "#ruling-holds/state.ts";

const without = (current: ReadonlySet<string>, rulingId: string): ReadonlySet<string> => {
	const next = new Set(current);
	next.delete(rulingId);
	return next;
};

// why: the registration lives and dies with the caller's scope, so an asker cut
// short — interrupted, or its session closed — leaves nothing behind that would
// keep mail away from a ruling nobody is waiting on any more.
export const makeHolding = (held: RulingHoldState) =>
	Effect.fn("rulingHolds.holding")(function* (rulingId: string): Effect.fn.Return<void, never, Scope.Scope> {
		yield* Effect.acquireRelease(
			Ref.update(held, (current) => new Set(current).add(rulingId)),
			() => Ref.update(held, (current) => without(current, rulingId)),
		);
	});
