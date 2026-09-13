import type { QuayChange, QuayGroup } from "#glass.ts";

export const QUAY_GROUPS: ReadonlyArray<QuayGroup> = ["alongside", "needsAttention", "checksRunning", "draft", "landed"];

export const groupTitle: Readonly<Record<QuayGroup, string>> = {
	alongside: "Alongside",
	checksRunning: "Checks running",
	draft: "Draft",
	landed: "Landed",
	needsAttention: "Needs attention",
};

export const groupVariant: Readonly<Record<QuayGroup, "destructive" | "outline" | "success" | "warning">> = {
	alongside: "success",
	checksRunning: "warning",
	draft: "outline",
	landed: "outline",
	needsAttention: "destructive",
};

export const stateLabel = (change: QuayChange): string => {
	if (change.group !== "landed") return groupTitle[change.group];
	return change.stage === "landed" ? "merged" : "closed";
};
