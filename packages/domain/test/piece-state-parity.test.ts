import { PieceState } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { PIECE_STATES } from "#piece-state.ts";

// Contract cannot depend on Domain, so this cross-package proof keeps its independently declared vocabulary complete.
it("the contract spells exactly the states the ladder can derive", () => {
	expect([...PieceState.literals].sort()).toEqual([...PIECE_STATES]);
});
