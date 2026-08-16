import type { ChangeRow } from "#change-rows.ts";
import type { ChangeView } from "#change-view.ts";
import { changeStatus, changesOfPiece } from "#outcome-status.ts";
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

const pendingOn = (world: VoyageWorld, pieceId: string): boolean =>
	changesOfPiece(world, pieceId).some(
		(change) => changeStatus(change) === "pending",
	);

// why: a landed change is history and leaves the quay the moment it lands. A
// withdrawn one is not history — nothing came of it and the piece is back
// where it started — so it stays under needs attention until the piece is
// waiting on another change or has finished by other means.
export const liesAtQuay = (
	world: VoyageWorld,
	done: ReadonlySet<string>,
	change: ChangeRow,
	pieceId: string,
): boolean => {
	if (change.stage === "landed") {
		return false;
	}
	if (change.stage !== "withdrawn") {
		return true;
	}
	return !done.has(pieceId) && !pendingOn(world, pieceId);
};
