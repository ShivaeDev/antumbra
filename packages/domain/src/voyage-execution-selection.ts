import { newestSession } from "#current-session-order.ts";
import type { AgentSessionRow, VoyageWorld } from "#voyage-rows.ts";

const compareIds = (left: string, right: string) => {
	if (left === right) {
		return 0;
	}
	return left < right ? -1 : 1;
};

export const executionSessionOfAgent = (
	world: VoyageWorld,
	agentId: string,
): AgentSessionRow | undefined => {
	const currentSessionId = world.currentSessionByAgent.get(agentId);
	const open = world.sessions.filter(
		(session) => session.agentId === agentId && session.status === "open",
	);
	if (currentSessionId === null) {
		return newestSession(open);
	}
	return currentSessionId === undefined
		? undefined
		: open.find((session) => session.id === currentSessionId);
};

export interface AssignedExecutionSession {
	readonly agentId: string;
	readonly backend: string;
	readonly sessionId: string;
}

export type AssignedExecution =
	| { readonly _tag: "unassigned" }
	| { readonly _tag: "unavailable"; readonly agentId: string }
	| ({ readonly _tag: "resume" } & AssignedExecutionSession);

export const assignedExecution = (
	world: VoyageWorld,
	pieceId: string,
): AssignedExecution => {
	const assigned = world.assignments
		.filter((assignment) => assignment.pieceId === pieceId)
		.filter(
			(assignment) => world.agentStatus.get(assignment.agentId) === "alive",
		)
		.map((assignment) => assignment.agentId)
		.filter((agentId, index, all) => all.indexOf(agentId) === index)
		.toSorted(compareIds);
	const agentId = assigned[0];
	if (agentId === undefined) {
		return { _tag: "unassigned" };
	}
	const session = executionSessionOfAgent(world, agentId);
	return session?.executionStatus === "idle"
		? {
				_tag: "resume",
				agentId,
				backend: session.backend,
				sessionId: session.id,
			}
		: { _tag: "unavailable", agentId };
};
