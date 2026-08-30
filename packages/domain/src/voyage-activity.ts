import { changesOfPiece } from "@antumbra/changes";
import type { VoyageWorld } from "#voyage-rows.ts";
import { piecesOfVoyage } from "#voyage-state.ts";

const agentsOf = (world: VoyageWorld, voyageId: string, pieceIds: ReadonlySet<string>): ReadonlySet<string> =>
	new Set([
		...world.crews.filter((crew) => crew.voyageId === voyageId).map((crew) => crew.agentId),
		...world.assignments.filter((assignment) => pieceIds.has(assignment.pieceId)).map((assignment) => assignment.agentId),
	]);

const present = (moments: ReadonlyArray<Date | null>): ReadonlyArray<Date> => moments.flatMap((moment) => (moment === null ? [] : [moment]));

// why: nothing stamps a voyage when something happens on it, so when it last
// stirred is read off the rows that carry a moment — a captain or hand born
// for it, a piece released or pulled back, a change its host last touched. A
// report or artifact lands inside a session born before it, so the moments
// the world does not carry fall within the ones it does.
export const lastStirredAt = (world: VoyageWorld, voyageId: string): Date | null => {
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
