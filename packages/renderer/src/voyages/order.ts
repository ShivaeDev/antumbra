import type { PieceState, PieceView, VoyageSummary } from "@antumbra/contract";

const RUNG: Readonly<Record<PieceState, number>> = {
	abandoned: 7,
	active: 0,
	blocked: 2,
	done: 6,
	held: 4,
	landing: 3,
	parked: 5,
	ready: 1,
};

export const byLadder = (pieces: ReadonlyArray<PieceView>): ReadonlyArray<PieceView> =>
	[...pieces].sort((left, right) => {
		const rung = RUNG[left.state] - RUNG[right.state];
		return rung === 0 ? left.title.localeCompare(right.title) : rung;
	});

export const byFlagship = (voyages: ReadonlyArray<VoyageSummary>): ReadonlyArray<VoyageSummary> => [
	...voyages.filter((voyage) => voyage.kind === "flagship"),
	...voyages.filter((voyage) => voyage.kind !== "flagship"),
];
