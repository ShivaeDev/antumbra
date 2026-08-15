import type { ChangeRow } from "#change-rows.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

// why: outcomes differ in how long they take to count. A report or an artifact
// is landed the instant it is written; a change is proposed and only lands
// when its host says so, and a withdrawn one never will. Doneness is a tally
// over these three answers, never a column.
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
	world: VoyageWorld,
	pieceId: string,
): ReadonlyArray<ChangeRow> => {
	const linked = new Set(
		world.pieceChanges
			.filter((link) => link.pieceId === pieceId)
			.map((link) => link.changeId),
	);
	return world.changes.filter((change) => linked.has(change.id));
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
	return {
		landed:
			countedLinks(world.pieceReports, pieceId) +
			countedLinks(world.pieceArtifacts, pieceId) +
			statuses.filter((status) => status === "landed").length,
		pending: statuses.filter((status) => status === "pending").length,
	};
};
