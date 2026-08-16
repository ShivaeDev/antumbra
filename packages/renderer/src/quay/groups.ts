import type { QuayGroup, QuayRow, QuayView } from "@antumbra/contract";

// why: read top-down as attention deserved — what could be merged this minute,
// what wants a hand, what is still running, and last what has not been offered
// for merging yet.
export const QUAY_GROUPS: ReadonlyArray<QuayGroup> = [
	"alongside",
	"needsAttention",
	"checksRunning",
	"draft",
];

export const groupTitle: Readonly<Record<QuayGroup, string>> = {
	alongside: "alongside",
	checksRunning: "checks running",
	draft: "draft",
	needsAttention: "needs attention",
};

export const rowsIn = (
	view: QuayView,
	group: QuayGroup,
): ReadonlyArray<QuayRow> => view.rows.filter((row) => row.group === group);
