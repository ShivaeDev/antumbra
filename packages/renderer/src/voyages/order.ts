import type { BoardEntryView, PieceState, PieceView, VoyageSummary } from "@antumbra/contract";

// why: the ladder reads top-down as attention deserved — what is moving, what
// could move next, what is stuck, what is only waiting on something to land,
// what has not been released, what was set aside, what is done, and last what
// was written off. A table rather than a list, because a state nobody gave a
// rung to would sit at -1 and sort above everything that matters.
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

// why: the smooth log is what the voyage wants its readers told, so it leads;
// the rough log follows as the scratch it is. Each register keeps the order it
// was written in.
export const bySalience = (entries: ReadonlyArray<BoardEntryView>): ReadonlyArray<BoardEntryView> => [
	...entries.filter((entry) => entry.register === "smooth"),
	...entries.filter((entry) => entry.register !== "smooth"),
];

// why: the fleet's own voyage leads, because it is where fleet-wide rulings
// and findings land and the admiral should never have to hunt for it. Every
// other voyage keeps the order it was opened in.
export const byFlagship = (voyages: ReadonlyArray<VoyageSummary>): ReadonlyArray<VoyageSummary> => [
	...voyages.filter((voyage) => voyage.kind === "flagship"),
	...voyages.filter((voyage) => voyage.kind !== "flagship"),
];
