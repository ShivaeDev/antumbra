import type { AgentSessionRow, VoyageWorld } from "#voyage-rows.ts";

export const idleExecutionSessionsOfAgent = (
	world: VoyageWorld,
	agentId: string,
): ReadonlyArray<AgentSessionRow> =>
	world.sessions.filter(
		(session) =>
			session.agentId === agentId &&
			session.status === "open" &&
			session.executionStatus === "idle",
	);

export interface AssignedExecutionSession {
	readonly agentId: string;
	readonly sessionId: string;
}

export const idleAssignedExecutionSessions = (
	world: VoyageWorld,
	pieceId: string,
): ReadonlyArray<AssignedExecutionSession> =>
	world.assignments
		.filter((assignment) => assignment.pieceId === pieceId)
		.filter(
			(assignment) => world.agentStatus.get(assignment.agentId) === "alive",
		)
		.flatMap((assignment) =>
			idleExecutionSessionsOfAgent(world, assignment.agentId).map(
				(session) => ({
					agentId: assignment.agentId,
					sessionId: session.id,
				}),
			),
		);
