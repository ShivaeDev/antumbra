import { changesOfPiece } from "@antumbra/changes";
import type { VoyageSummaryRows } from "#voyage-rows.ts";
import { piecesOfVoyage } from "#voyage-state.ts";

type ActivityRows = Pick<
	VoyageSummaryRows,
	"memberships" | "crews" | "assignments" | "pieces" | "sessions" | "changes" | "pieceChanges" | "dismissedChangeIds"
>;

const agentsOf = (world: ActivityRows, voyageId: string, pieceIds: ReadonlySet<string>): ReadonlySet<string> =>
	new Set([
		...world.crews.filter((crew) => crew.voyageId === voyageId).map((crew) => crew.agentId),
		...world.assignments.filter((assignment) => pieceIds.has(assignment.pieceId)).map((assignment) => assignment.agentId),
	]);

const present = (moments: ReadonlyArray<Date | null>): ReadonlyArray<Date> => moments.flatMap((moment) => (moment === null ? [] : [moment]));

export const lastStirredAt = (world: ActivityRows, voyageId: string): Date | null => {
	const pieceIds = new Set(piecesOfVoyage(world, voyageId));
	const agentIds = agentsOf(world, voyageId, pieceIds);
	const pieces = world.pieces.filter((piece) => pieceIds.has(piece.id));
	const moments = present([
		...world.sessions.filter((session) => agentIds.has(session.agentId)).map((session) => session.createdAt),
		...pieces.flatMap((piece) => [piece.launchedAt, piece.parkedAt]),
		...pieces.flatMap((piece) => changesOfPiece(world, piece.id).map((change) => change.activityAt)),
	]);
	return moments.length === 0 ? null : new Date(Math.max(...moments.map((moment) => moment.getTime())));
};
