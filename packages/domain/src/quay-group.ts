import type { ChangeRow } from "@antumbra/changes";
import type { ChangeView } from "#change-view.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export type QuayGroup =
	| "alongside"
	| "checksRunning"
	| "draft"
	| "needsAttention";

// why: the ladder is read in this order and no other. Closed without merging
// wants a person before anything else does; a draft is not offered yet, so it
// cannot be alongside however green it is; red checks, a review asking for
// changes and a conflict are the same call for a hand. What is left is either
// clean enough to merge or still running.
export const quayGroup = (change: ChangeView): QuayGroup => {
	if (change.stage === "withdrawn") {
		return "needsAttention";
	}
	if (change.isDraft) {
		return "draft";
	}
	const wanting =
		change.checks === "red" ||
		change.review === "changes_requested" ||
		change.mergeable === "conflict";
	if (wanting) {
		return "needsAttention";
	}
	return change.mergeable === "clean" && change.checks !== "pending"
		? "alongside"
		: "checksRunning";
};

// why: a change leaves the quay for one of two reasons — it landed, or the
// admiral dismissed it. Nothing else takes it off the list, because a change
// that is neither is still owed something and hiding it is how a dead end is
// made: a closed change that quietly disappeared while it still counted was
// the whole of the trouble. So it waits here, wanting a hand or a verdict.
export const liesAtQuay = (world: VoyageWorld, change: ChangeRow): boolean =>
	change.stage !== "landed" && !world.dismissedChangeIds.has(change.id);
