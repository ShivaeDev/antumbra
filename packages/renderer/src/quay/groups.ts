import type { QuayGroup, QuayView } from "@antumbra/contract";

export const QUAY_GROUPS: ReadonlyArray<QuayGroup> = ["alongside", "needsAttention", "checksRunning", "draft"];

export const groupTitle: Readonly<Record<QuayGroup, string>> = {
	alongside: "Alongside",
	checksRunning: "Checks running",
	draft: "Draft",
	needsAttention: "Needs attention",
};

export const lastSight = (view: QuayView): string | undefined =>
	view.rows
		.map((row) => row.change.observedAt)
		.sort()
		.at(-1);
