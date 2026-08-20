import type {
	BoardEntryView,
	PieceState,
	PieceView,
	VoyageCaptainView,
	VoyageState,
} from "@antumbra/contract";
import type { PieceAct } from "#voyages/acts.ts";

export const voyageStateLabel: Readonly<Record<VoyageState, string>> = {
	quiet: "Quiet",
	underWay: "Under way",
};

// why: every state the domain can publish is named here in the register the
// window speaks, so a new one is a compile error rather than a wire spelling
// leaking onto a badge.
export const pieceStateLabel: Readonly<Record<PieceState, string>> = {
	active: "Active",
	blocked: "Blocked",
	done: "Landed",
	held: "Held",
	landing: "Landing",
	parked: "Parked",
	ready: "Ready",
};

export const pieceActLabel: Readonly<Record<PieceAct, string>> = {
	launch: "Launch",
	park: "Park",
	rewire: "Rewire",
	unpark: "Unpark",
};

// why: the two registers are glossary terms, so the board calls them what the
// rest of the system calls them rather than shortening them to fit a chip.
export const boardRegisterLabel: Readonly<
	Record<BoardEntryView["register"], string>
> = {
	rough: "Rough log",
	smooth: "Smooth log",
};

// why: a captain that is alive but not at work is woken back into its own
// conversation, while any other absence hails a fresh one — so the button
// names which of the two the same act is about to do.
export const captainCallLabel = (captain: VoyageCaptainView | null): string =>
	captain?.status === "alive" ? "Wake the captain" : "Hail a captain";

export const dependsOnLabel = (
	piece: PieceView,
	pieces: ReadonlyArray<PieceView>,
): string => {
	const titles = piece.dependsOn.map(
		(id) => pieces.find((other) => other.id === id)?.title ?? id,
	);
	return titles.length === 0 ? "" : `Depends on: ${titles.join(", ")}`;
};

// why: a board records which of the crew wrote an entry, and an entry with no
// author agent is one you wrote yourself.
export const authorLabel = (authorAgentId: string | null): string =>
	authorAgentId === null ? "you" : authorAgentId.slice(0, 8);

export const whenLabel = (stamp: string): string =>
	stamp.slice(0, 16).replace("T", " ");
