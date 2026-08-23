import type { QuayGroup, QuayView } from "@antumbra/contract";

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

// why: how old the reading is belongs to the page rather than to each card —
// one pass of the watcher stamps them all, so the newest stamp speaks for the
// whole quay and says whether asking again would tell you anything.
export const lastSight = (view: QuayView): string | undefined =>
	view.rows
		.map((row) => row.change.observedAt)
		.sort()
		.at(-1);
