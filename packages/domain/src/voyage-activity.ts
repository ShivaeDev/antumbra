import type { VoyageSummaryRows } from "#voyage-rows.ts";
import { piecesOfVoyage } from "#voyage-state.ts";

type ActivityRows = Pick<VoyageSummaryRows, "memberships" | "crews" | "assignments" | "pieces" | "sessions" | "changes" | "pieceChanges">;

const agentsOf = (world: ActivityRows, voyageId: string, pieceIds: ReadonlySet<string>): ReadonlySet<string> =>
	new Set([
		...world.crews.filter((crew) => crew.voyageId === voyageId).map((crew) => crew.agentId),
		...world.assignments.filter((assignment) => pieceIds.has(assignment.pieceId)).map((assignment) => assignment.agentId),
	]);

const latestMoment = (latest: number | null, moment: Date | null): number | null =>
	moment === null ? latest : Math.max(latest ?? -Infinity, moment.getTime());

export const lastStirredAt = (world: ActivityRows, voyageId: string): Date | null => {
	const pieceIds = new Set(piecesOfVoyage(world, voyageId));
	const agentIds = agentsOf(world, voyageId, pieceIds);
	const pieces = world.pieces.filter((piece) => pieceIds.has(piece.id));
	const existingPieceIds = new Set(pieces.map((piece) => piece.id));
	const changeIds = new Set(world.pieceChanges.filter((link) => existingPieceIds.has(link.pieceId)).map((link) => link.changeId));
	let latest: number | null = null;
	for (const session of world.sessions) {
		if (agentIds.has(session.agentId)) {
			latest = latestMoment(latest, session.createdAt);
		}
	}
	for (const piece of pieces) {
		latest = latestMoment(latestMoment(latest, piece.launchedAt), piece.parkedAt);
	}
	for (const change of world.changes) {
		if (changeIds.has(change.id)) {
			latest = latestMoment(latest, change.activityAt);
		}
	}
	return latest === null ? null : new Date(latest);
};
