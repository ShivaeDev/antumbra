import { changeStatus, changesOfPiece, unresolvedChangesOfPiece } from "@antumbra/changes";
import type { VoyageWorld } from "#voyage-rows.ts";

// Changes land only after host observation; a withdrawn change remains pending only while its replacement is underway.
export interface OutcomeTally {
	readonly landed: number;
	readonly pending: number;
}

const countedLinks = (links: ReadonlyArray<{ readonly pieceId: string }>, pieceId: string): number =>
	links.filter((link) => link.pieceId === pieceId).length;

export const pieceOutcomeTally = (world: VoyageWorld, pieceId: string): OutcomeTally => {
	const statuses = changesOfPiece(world, pieceId).map(changeStatus);
	const landedChanges = statuses.filter((status) => status === "landed").length;
	return {
		landed:
			countedLinks(world.pieceReports, pieceId) +
			[...world.artifacts.values()].filter((artifact) => artifact.pieceId === pieceId).length +
			landedChanges +
			Number(world.pieceVerdicts.has(pieceId)),
		pending: unresolvedChangesOfPiece(world, pieceId).length,
	};
};
