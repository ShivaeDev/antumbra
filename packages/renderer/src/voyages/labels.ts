import type { PieceState, PieceView, VoyageState } from "@antumbra/contract";

export const voyageStateLabel: Readonly<Record<VoyageState, string>> = {
	quiet: "quiet",
	underWay: "under way",
};

// why: a voyage is under way because its captain or a piece of it is at work,
// so it wears the colour of work rather than of a setting someone chose.
export const voyageStateColour: Readonly<Record<VoyageState, string>> = {
	quiet: "#8a8f98",
	underWay: "#7cd3a0",
};

// why: the states read at a glance by colour rather than by reading — what is
// moving is green, what waits is blue, what is stuck is amber, what is done
// but for something landing elsewhere is teal, and what is finished or not yet
// released recedes.
export const stateColour: Readonly<Record<PieceState, string>> = {
	active: "#7cd3a0",
	blocked: "#ff9f5c",
	done: "#8a8f98",
	held: "#8a8f98",
	landing: "#5cc8d3",
	parked: "#c9a0ff",
	ready: "#7c9cff",
};

export const dependsOnLabel = (
	piece: PieceView,
	pieces: ReadonlyArray<PieceView>,
): string => {
	const titles = piece.dependsOn.map(
		(id) => pieces.find((other) => other.id === id)?.title ?? id,
	);
	return titles.length === 0 ? "" : `depends on: ${titles.join(", ")}`;
};

// why: a board records which of the crew wrote an entry, and an entry with no
// author agent is one you wrote yourself.
export const authorLabel = (authorAgentId: string | null): string =>
	authorAgentId === null ? "you" : authorAgentId.slice(0, 8);

export const whenLabel = (stamp: string): string =>
	stamp.slice(0, 16).replace("T", " ");
