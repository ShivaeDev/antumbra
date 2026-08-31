import type { PieceView } from "#piece-view.ts";

const parts = (fragments: ReadonlyArray<string>): string => fragments.filter((fragment) => fragment !== "").join(" ");

const dependsOn = (piece: PieceView): string => (piece.dependsOn.length === 0 ? "" : `depends on ${[...piece.dependsOn].sort().join(", ")}`);

const awaitsRuling = (piece: PieceView): string =>
	piece.awaitingRulings.length === 0
		? ""
		: `awaits ruling ${[...piece.awaitingRulings]
				.sort((left, right) => left.rulingId.localeCompare(right.rulingId))
				.map((ruling) => `${ruling.rulingId}: ${ruling.question}`)
				.join("; ")}`;

const landedTitles = (piece: PieceView): ReadonlyArray<string> => [
	...piece.reports.map((report) => report.title),
	...piece.artifacts.map((artifact) => artifact.title),
];

export const pieceLine = (piece: PieceView): string =>
	parts([`- ${piece.id}`, piece.title, `[${piece.state}]`, dependsOn(piece), awaitsRuling(piece)]);

export const pieceLineWithOutcomes = (piece: PieceView): string => {
	const landed = landedTitles(piece);
	return parts([pieceLine(piece), landed.length === 0 ? "" : `landed: ${landed.join("; ")}`]);
};
