import { newestSession } from "@antumbra/sessions";
import type { AgentSessionRow, RetirementWorld } from "#voyage-rows.ts";

export const executionSessionOfAgent = (
	world: Pick<RetirementWorld, "currentSessionByAgent" | "sessions">,
	agentId: string,
): AgentSessionRow | undefined => {
	const currentSessionId = world.currentSessionByAgent.get(agentId);
	if (currentSessionId === null) {
		return newestSession(world.sessions.filter((session) => session.agentId === agentId && session.status === "open"));
	}
	return currentSessionId === undefined
		? undefined
		: world.sessions.find((session) => session.id === currentSessionId && session.agentId === agentId && session.status === "open");
};

interface AssignedExecutionSession {
	readonly agentId: string;
	readonly backend: string;
	readonly sessionId: string;
}

export type AssignedExecution =
	| { readonly _tag: "unassigned" }
	| { readonly _tag: "unavailable"; readonly agentId: string }
	| ({ readonly _tag: "resume" } & AssignedExecutionSession);

export const assignedExecution = (world: RetirementWorld, pieceId: string): AssignedExecution => {
	let agentId: string | undefined;
	for (const assignment of world.assignments) {
		if (
			assignment.pieceId === pieceId &&
			world.agentStatus.get(assignment.agentId) === "alive" &&
			(agentId === undefined || assignment.agentId < agentId)
		) {
			agentId = assignment.agentId;
		}
	}
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
