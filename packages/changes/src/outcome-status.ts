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
	return unresolvedChanges(changesOfPiece(world, pieceId), world.dismissedChangeIds);
};

const unresolvedChanges = (rows: ReadonlyArray<ChangeRow>, dismissedIds: ReadonlySet<string>): ReadonlyArray<ChangeRow> => {
	const changes = rows.filter((change) => !dismissedIds.has(change.id));
	const replacementUnderWay = changes.some((change) => changeStatus(change) === "pending");
	return changes.filter((change) => {
		const status = changeStatus(change);
		return status === "pending" || (status === "withdrawn" && replacementUnderWay);
	});
};

export const unresolvedChangeIds = (world: ChangeStatusWorld): ReadonlySet<string> => {
	const changesById = new Map(world.changes.map((change) => [change.id, change]));
	const linksByPiece = Map.groupBy(world.pieceChanges, (link) => link.pieceId);
	return new Set(
		[...linksByPiece.values()].flatMap((links) => {
			const changeIds = new Set(links.map((link) => link.changeId));
			const changes = [...changeIds].flatMap((id) => {
				const change = changesById.get(id);
				return change === undefined ? [] : [change];
			});
			return unresolvedChanges(changes, world.dismissedChangeIds).map((change) => change.id);
		}),
	);
};
