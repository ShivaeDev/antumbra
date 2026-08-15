import type { PieceRow, VoyageRow } from "#voyage-rows.ts";

// why: the charter is the only thing crew is told at birth, and it is read by
// a model, not parsed — so it stays plain prose in a fixed order: where the
// voyage is going, what surrounds it, then the piece this agent answers to.
export const composeCrewCharter = (
	voyage: VoyageRow,
	piece: PieceRow,
): string =>
	[
		`# North star`,
		voyage.northStar,
		``,
		`# Context`,
		voyage.context,
		``,
		`# Your piece: ${piece.title}`,
		piece.charter,
		``,
		`# Expected outcome`,
		piece.expectation,
	].join("\n");
