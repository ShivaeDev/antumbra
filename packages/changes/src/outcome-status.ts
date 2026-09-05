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

const linkedChangesByPiece = (world: ChangeStatusWorld): ReadonlyMap<string, ReadonlyArray<ChangeRow>> => {
	const changesById = new Map(world.changes.map((change) => [change.id, change]));
	const linksByPiece = Map.groupBy(world.pieceChanges, (link) => link.pieceId);
	return new Map(
		[...linksByPiece].map(([pieceId, links]) => {
			const changeIds = new Set(links.map((link) => link.changeId));
			const changes = [...changeIds].flatMap((id) => {
				const change = changesById.get(id);
				return change === undefined ? [] : [change];
			});
			return [pieceId, changes];
		}),
	);
};

export const changeOutcomeTallies = (world: ChangeStatusWorld): ReadonlyMap<string, { readonly landed: number; readonly pending: number }> =>
	new Map(
		[...linkedChangesByPiece(world)].map(([pieceId, changes]) => [
			pieceId,
			{
				landed: changes.filter((change) => changeStatus(change) === "landed").length,
				pending: unresolvedChanges(changes, world.dismissedChangeIds).length,
			},
		]),
	);

export const unresolvedChangeIds = (world: ChangeStatusWorld): ReadonlySet<string> =>
	new Set(
		[...linkedChangesByPiece(world).values()].flatMap((changes) => unresolvedChanges(changes, world.dismissedChangeIds).map((change) => change.id)),
	);
