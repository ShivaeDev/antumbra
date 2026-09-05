import type { SessionSituation } from "@antumbra/contract";

export const situationsByAgent = (
	assignments: ReadonlyArray<{ readonly agentId: string; readonly pieceId: string }>,
	byPiece: ReadonlyMap<string, ReadonlyArray<SessionSituation>>,
): ReadonlyMap<string, ReadonlyArray<SessionSituation>> =>
	new Map(
		[...Map.groupBy(assignments, (assignment) => assignment.agentId)].map(([agentId, owned]) => [
			agentId,
			owned.flatMap((assignment) => byPiece.get(assignment.pieceId) ?? []),
		]),
	);
