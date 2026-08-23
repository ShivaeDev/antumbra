import { PieceState } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { PIECE_STATES } from "#piece-state.ts";

// why: the contract spells the ladder's words a second time, because it may
// not depend on the domain that derives them. Nothing but this makes the two
// lists agree — a state added on one side alone is either a word the window
// can never be handed or a word it must render and has no name for.
it("the contract spells exactly the states the ladder can derive", () => {
	expect([...PieceState.literals].sort()).toEqual([...PIECE_STATES]);
});
