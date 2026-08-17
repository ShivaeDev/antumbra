import type { ChangeRow, PieceChangeRow } from "#change-rows.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

// why: outcomes differ in how long they take to count. A report or an artifact
// is landed the instant it is written; a change is proposed and only lands
// when its host says so. A withdrawn change stays unresolved until it reopens
// or another linked change lands. Doneness is a tally, never a column.
export type OutcomeStatus = "landed" | "pending" | "withdrawn";

export interface OutcomeTally {
	readonly landed: number;
	readonly pending: number;
}

export const changeStatus = (row: ChangeRow): OutcomeStatus => {
	if (row.stage === "landed") {
		return "landed";
	}
	return row.stage === "withdrawn" ? "withdrawn" : "pending";
};

export const changesOfPiece = (
	world: Pick<VoyageWorld, "changes" | "pieceChanges">,
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

const countedLinks = (
	links: ReadonlyArray<{ readonly pieceId: string }>,
	pieceId: string,
): number => links.filter((link) => link.pieceId === pieceId).length;

export const pieceOutcomeTally = (
	world: VoyageWorld,
	pieceId: string,
): OutcomeTally => {
	const statuses = changesOfPiece(world, pieceId).map(changeStatus);
	const landedChanges = statuses.filter((status) => status === "landed").length;
	return {
		landed:
			countedLinks(world.pieceReports, pieceId) +
			[...world.artifacts.values()].filter(
				(artifact) => artifact.pieceId === pieceId,
			).length +
			landedChanges,
		pending: unresolvedChangesOfPiece(world, pieceId).length,
	};
};
