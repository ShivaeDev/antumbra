import type { BoardEntryView, PieceState, PieceView } from "@antumbra/contract";

// why: the ladder reads top-down as attention deserved — what is moving, what
// could move next, what is stuck, what is only waiting on something to land,
// what has not been released, what was set aside, and last what is done.
const LADDER: ReadonlyArray<PieceState> = [
	"active",
	"ready",
	"blocked",
	"landing",
	"held",
	"parked",
	"done",
];

export const byLadder = (
	pieces: ReadonlyArray<PieceView>,
): ReadonlyArray<PieceView> =>
	[...pieces].sort((left, right) => {
		const rung = LADDER.indexOf(left.state) - LADDER.indexOf(right.state);
		return rung === 0 ? left.title.localeCompare(right.title) : rung;
	});

// why: the smooth log is what the voyage wants its readers told, so it leads;
// the rough log follows as the scratch it is. Each register keeps the order it
// was written in.
export const bySalience = (
	entries: ReadonlyArray<BoardEntryView>,
): ReadonlyArray<BoardEntryView> => [
	...entries.filter((entry) => entry.register === "smooth"),
	...entries.filter((entry) => entry.register !== "smooth"),
];
