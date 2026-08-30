import { type AgentStatus, agentTransition, type InvalidAgentTransition } from "@antumbra/vocabulary/agent-runtime";
import { Result } from "effect";
import { CurrentSessionInvalid } from "#current/errors.ts";
import { newestSession } from "#current/order.ts";
import type { DecodedAgent, DecodedSession } from "#current/reconcile-rows.ts";

export interface AgentReconcilePlan {
	readonly agentsToReclaim: ReadonlyArray<{
		readonly agentId: string;
		readonly fromStatus: AgentStatus;
		readonly status: AgentStatus;
	}>;
	readonly pointers: ReadonlyArray<{
		readonly agentId: string;
		readonly currentSessionId: string | null;
		readonly fromCurrentSessionId: string | null;
	}>;
	readonly sessionsToClose: ReadonlyArray<string>;
}

const pointerChange = (
	agentId: string,
	fromCurrentSessionId: string | null,
	currentSessionId: string | null,
): AgentReconcilePlan["pointers"][number] => ({
	agentId,
	currentSessionId,
	fromCurrentSessionId,
});

export const planAgent = (
	agent: DecodedAgent,
	owned: ReadonlyArray<DecodedSession>,
	allSessions: ReadonlyArray<DecodedSession>,
): Result.Result<AgentReconcilePlan, CurrentSessionInvalid | InvalidAgentTransition> => {
	const open = owned.filter((session) => session.status === "open");
	if (agent.status === "dormant" || agent.status === "retired") {
		return Result.succeed({
			agentsToReclaim: [],
			pointers: agent.currentSessionId === null ? [] : [pointerChange(agent.id, agent.currentSessionId, null)],
			sessionsToClose: open.map((session) => session.id),
		});
	}
	const currentId = agent.currentSessionId ?? newestSession(open)?.id ?? null;
	// why: an alive or spawning Agent with neither a pointer nor an open root
	// holds work it can never do — atWork fails closed on absent Session truth,
	// so its Piece stays active and is never offered again. Accepting that state
	// is how the deadlock survived; boot reclaims the Agent through the status
	// table instead, and dormant is what hands the Piece back to the pool.
	if (currentId === null) {
		const reclaimed = agentTransition(agent.status, "reclaim");
		return Result.isFailure(reclaimed)
			? Result.fail(reclaimed.failure)
			: Result.succeed({
					agentsToReclaim: [
						{
							agentId: agent.id,
							fromStatus: agent.status,
							status: reclaimed.success,
						},
					],
					pointers: [],
					sessionsToClose: [],
				});
	}
	const current = owned.find((session) => session.id === currentId);
	const reservedBirth = agent.status === "spawning" && !allSessions.some((session) => session.id === currentId);
	if (!reservedBirth && current?.status !== "open") {
		return Result.fail(
			new CurrentSessionInvalid({
				agentId: agent.id,
				detail: `${currentId} is missing or closed`,
			}),
		);
	}
	return Result.succeed({
		agentsToReclaim: [],
		pointers: agent.currentSessionId === null ? [pointerChange(agent.id, null, currentId)] : [],
		sessionsToClose: open.filter((session) => session.id !== currentId).map((session) => session.id),
	});
};
