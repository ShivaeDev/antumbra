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

const unresolvedChanges = (rows: ReadonlyArray<ChangeRow>, dismissedIds: ReadonlySet<string>): ReadonlyArray<ChangeRow> => {
	const changes = rows.filter((change) => !dismissedIds.has(change.id));
	const replacementUnderWay = changes.some((change) => changeStatus(change) === "pending");
	return changes.filter((change) => {
		const status = changeStatus(change);
		return status === "pending" || (status === "withdrawn" && replacementUnderWay);
	});
};

export const changesByPiece = (world: Pick<ChangeStatusWorld, "changes" | "pieceChanges">): ReadonlyMap<string, ReadonlyArray<ChangeRow>> => {
	const links = Map.groupBy(world.pieceChanges, (link) => link.changeId);
	const grouped = new Map<string, Array<ChangeRow>>();
	for (const change of world.changes) {
		for (const pieceId of new Set((links.get(change.id) ?? []).map((link) => link.pieceId))) {
			const rows = grouped.get(pieceId);
			if (rows === undefined) grouped.set(pieceId, [change]);
			else rows.push(change);
		}
	}
	return grouped;
};

export const changeOutcomeTallies = (world: ChangeStatusWorld): ReadonlyMap<string, { readonly landed: number; readonly pending: number }> =>
	new Map(
		[...changesByPiece(world)].map(([pieceId, changes]) => [
			pieceId,
			{
				landed: changes.filter((change) => changeStatus(change) === "landed").length,
				pending: unresolvedChanges(changes, world.dismissedChangeIds).length,
			},
		]),
	);

export const unresolvedChangeIds = (world: ChangeStatusWorld): ReadonlySet<string> =>
	new Set([...changesByPiece(world).values()].flatMap((changes) => unresolvedChanges(changes, world.dismissedChangeIds).map((change) => change.id)));
