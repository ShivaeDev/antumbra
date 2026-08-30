import type { ChangeRow, PieceChangeRow } from "#change-rows.ts";

export type OutcomeStatus = "landed" | "pending" | "withdrawn";

type ChangeStatusWorld = {
	readonly changes: ReadonlyArray<ChangeRow>;
	// why: a dismissed change is a settled fact, so it leaves every tally the
	// moment the verdict lands — the stage still says how it died.
	readonly dismissedChangeIds: ReadonlySet<string>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
};

export const changeStatus = (row: ChangeRow): OutcomeStatus => {
	if (row.stage === "landed") {
		return "landed";
	}
	return row.stage === "withdrawn" ? "withdrawn" : "pending";
};

export const changesOfPiece = (world: ChangeStatusWorld, pieceId: string): ReadonlyArray<ChangeRow> => {
	const linked = new Set(world.pieceChanges.filter((link) => link.pieceId === pieceId).map((link) => link.changeId));
	return world.changes.filter((change) => linked.has(change.id));
};

// why: a change closed without merging is only owed something while a
// replacement is genuinely on its way — one being prepared or already open on
// the same piece. With no live sibling it is a dead end rather than work in
// flight, so it stops holding the piece, stops holding the berth it was
// written in, and waits at the quay for a verdict: visible, never load-bearing.
export const unresolvedChangesOfPiece = (world: ChangeStatusWorld, pieceId: string): ReadonlyArray<ChangeRow> => {
	const changes = changesOfPiece(world, pieceId).filter((change) => !world.dismissedChangeIds.has(change.id));
	const replacementUnderWay = changes.some((change) => changeStatus(change) === "pending");
	return changes.filter((change) => {
		const status = changeStatus(change);
		return status === "pending" || (status === "withdrawn" && replacementUnderWay);
	});
};

export const unresolvedChangeIds = (world: ChangeStatusWorld): ReadonlySet<string> => {
	const pieceIds = new Set(world.pieceChanges.map((link) => link.pieceId));
	return new Set([...pieceIds].flatMap((pieceId) => unresolvedChangesOfPiece(world, pieceId).map((change) => change.id)));
};
