import type { ChangeRow } from "@antumbra/changes";
import type { ChangeView } from "#change-view.ts";

export type QuayGroup = "alongside" | "checksRunning" | "draft" | "needsAttention";

export const quayGroup = (change: ChangeView): QuayGroup => {
	if (change.stage === "withdrawn") {
		return "needsAttention";
	}
	if (change.isDraft) {
		return "draft";
	}
	const wanting = change.checks === "red" || change.review === "changes_requested" || change.mergeable === "conflict";
	if (wanting) {
		return "needsAttention";
	}
	return change.mergeable === "clean" && change.checks !== "pending" ? "alongside" : "checksRunning";
};

export const liesAtQuay = (world: { readonly dismissedChangeIds: ReadonlySet<string> }, change: ChangeRow): boolean =>
	change.stage !== "landed" && !world.dismissedChangeIds.has(change.id);
