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
	sessionIds: ReadonlySet<string>,
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
	// A live regression left a Piece active forever when its alive Agent had no Session.
	// Reclaiming the Agent returns that Piece to dispatch.
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
	const reservedBirth = agent.status === "spawning" && !sessionIds.has(currentId);
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
