import {
	changeStatus,
	changesOfPiece,
	unresolvedChangesOfPiece,
} from "@antumbra/changes";
import type { VoyageWorld } from "#voyage-rows.ts";

// why: outcomes differ in how long they take to count. A report or an artifact
// is landed the instant it is written; a change is proposed and only lands
// when its host says so. A withdrawn change stays unresolved only while a
// replacement is under way. An admiral's verdict lands the instant it is
// spoken, which is the whole of what it does — doneness stays a tally, never a
// column, and no verdict writes the answer the tally is asked for.
export interface OutcomeTally {
	readonly landed: number;
	readonly pending: number;
}

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
			landedChanges +
			Number(world.pieceVerdicts.has(pieceId)),
		pending: unresolvedChangesOfPiece(world, pieceId).length,
	};
};
