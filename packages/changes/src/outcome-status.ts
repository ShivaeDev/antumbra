import type { ChangeRow, PieceChangeRow } from "#change-rows.ts";

export type OutcomeStatus = "landed" | "pending" | "withdrawn";

export const changeStatus = (row: ChangeRow): OutcomeStatus => {
	if (row.stage === "landed") {
		return "landed";
	}
	return row.stage === "withdrawn" ? "withdrawn" : "pending";
};

export const changesOfPiece = (
	world: {
		readonly changes: ReadonlyArray<ChangeRow>;
		readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
	},
	pieceId: string,
): ReadonlyArray<ChangeRow> => {
	const linked = new Set(
		world.pieceChanges
			.filter((link) => link.pieceId === pieceId)
			.map((link) => link.changeId),
	);
	return world.changes.filter((change) => linked.has(change.id));
};

export const unresolvedChangesOfPiece = (
	world: {
		readonly changes: ReadonlyArray<ChangeRow>;
		readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
	},
	pieceId: string,
): ReadonlyArray<ChangeRow> => {
	const changes = changesOfPiece(world, pieceId);
	const replacementLanded = changes.some(
		(change) => changeStatus(change) === "landed",
	);
	return changes.filter((change) => {
		const status = changeStatus(change);
		return (
			status === "pending" || (status === "withdrawn" && !replacementLanded)
		);
	});
};

export const unresolvedChangeIds = (world: {
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
}): ReadonlySet<string> => {
	const pieceIds = new Set(world.pieceChanges.map((link) => link.pieceId));
	return new Set(
		[...pieceIds].flatMap((pieceId) =>
			unresolvedChangesOfPiece(world, pieceId).map((change) => change.id),
		),
	);
};
