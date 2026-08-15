import type { PieceView } from "#voyage-view.ts";

const parts = (fragments: ReadonlyArray<string>): string =>
	fragments.filter((fragment) => fragment !== "").join(" ");

const dependsOn = (piece: PieceView): string =>
	piece.dependsOn.length === 0
		? ""
		: `depends on ${[...piece.dependsOn].sort().join(", ")}`;

const landedTitles = (piece: PieceView): ReadonlyArray<string> => [
	...piece.reports.map((report) => report.title),
	...piece.artifacts.map((artifact) => artifact.title),
];

// why: one line per piece, in a shape a model can scan and a test can assert:
// what it is, where it stands, and what still gates it.
export const pieceLine = (piece: PieceView): string =>
	parts([`- ${piece.id}`, piece.title, `[${piece.state}]`, dependsOn(piece)]);

export const pieceLineWithOutcomes = (piece: PieceView): string => {
	const landed = landedTitles(piece);
	return parts([
		pieceLine(piece),
		landed.length === 0 ? "" : `landed: ${landed.join("; ")}`,
	]);
};
