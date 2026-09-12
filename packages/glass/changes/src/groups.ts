import type { QuayGroup } from "#glass.ts";

export const QUAY_GROUPS: ReadonlyArray<QuayGroup> = ["alongside", "needsAttention", "checksRunning", "draft"];

export const groupTitle: Readonly<Record<QuayGroup, string>> = {
	alongside: "Alongside",
	checksRunning: "Checks running",
	draft: "Draft",
	needsAttention: "Needs attention",
};
