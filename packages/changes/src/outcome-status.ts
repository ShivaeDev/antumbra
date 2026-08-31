import type { ChangeRow, PieceChangeRow } from "#change-rows.ts";

type OutcomeStatus = "landed" | "pending" | "withdrawn";

type ChangeStatusWorld = {
	readonly changes: ReadonlyArray<ChangeRow>;
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
