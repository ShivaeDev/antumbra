import { expect, it } from "@effect/vitest";
import { readyPieces } from "#dispatch-policy.ts";
import { pieceLine } from "#piece-line.ts";
import { pieceStates } from "#piece-state.ts";
import { pieceView } from "#piece-view.ts";
import { piece, stateOf, world } from "#test/piece-ladder-fixtures.ts";

const reef = {
	backend: "scripted",
	context: "the reef is uncharted",
	focusedAt: null,
	id: "voyage-1",
	name: "Chart the reef",
	northStar: "every shoal is known",
};

const gated = world({
	memberships: [{ pieceId: "alpha", voyageId: "voyage-1" }],
	rulingGates: [{ pieceId: "alpha", rulingId: "ruling-1" }],
	voyages: [reef],
});

const released = world({ ...gated, rulingGates: [] });

it("a launched piece an open ruling gates is blocked", () => {
	expect(stateOf(gated)).toBe("blocked");
	expect(stateOf(released)).toBe("ready");
});

it("an open ruling holds a piece even when its dependencies landed", () => {
	const built = world({
		...gated,
		edges: [{ fromPieceId: "bravo", toPieceId: "alpha" }],
		pieceVerdicts: new Map([["bravo", "delivered"]]),
		pieces: [piece("alpha"), piece("bravo")],
	});
	expect(stateOf(built)).toBe("blocked");
});

it("the dispatcher never sees a gated piece as ready", () => {
	expect(readyPieces(gated)).toEqual([]);
	expect(readyPieces(released).map((ready) => ready.piece.id)).toEqual([
		"alpha",
	]);
});

it("a piece names the rulings holding it", () => {
	const view = pieceView(gated, pieceStates(gated), piece("alpha"));
	expect(view.awaitingRulings).toEqual(["ruling-1"]);
	expect(pieceLine(view)).toBe(
		"- alpha alpha [blocked] awaits ruling ruling-1",
	);
	expect(
		pieceView(released, pieceStates(released), piece("alpha")).awaitingRulings,
	).toEqual([]);
});
