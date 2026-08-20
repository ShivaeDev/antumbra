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
	alongside: "Alongside",
	checksRunning: "Checks running",
	draft: "Draft",
	needsAttention: "Needs attention",
};

export const rowsIn = (
	view: QuayView,
	group: QuayGroup,
): ReadonlyArray<QuayRow> => view.rows.filter((row) => row.group === group);

// why: the whole quay is the default reading, and narrowing to one group is
// how a reader who came for one question stops the other three answering it.
export type QuayFilter = QuayGroup | "all";

export interface GroupCount {
	readonly count: number;
	readonly group: QuayGroup;
}

// why: a group nobody is waiting on is not worth a chip to narrow to, for the
// same reason it is not worth a heading.
export const groupCounts = (view: QuayView): ReadonlyArray<GroupCount> =>
	QUAY_GROUPS.map((group) => ({
		count: rowsIn(view, group).length,
		group,
	})).filter((counted) => counted.count > 0);

export const shownGroups = (only: QuayFilter): ReadonlyArray<QuayGroup> =>
	only === "all" ? QUAY_GROUPS : [only];

// why: how old the reading is belongs to the page rather than to each card —
// one pass of the watcher stamps them all, so the newest stamp speaks for the
// whole quay and says whether asking again would tell you anything.
export const lastSight = (view: QuayView): string | undefined =>
	view.rows
		.map((row) => row.change.observedAt)
		.sort()
		.at(-1);
