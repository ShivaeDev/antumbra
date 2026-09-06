import type {
	InvalidAgentTransition,
	InvalidSessionExecutionStatus,
	InvalidSessionExecutionTransition,
	StoredAgentSessionStatusInvalid,
	StoredAgentStatusInvalid,
} from "@antumbra/vocabulary/agent-runtime.ts";
import { Result } from "effect";
import { type AgentReconcilePlan, planAgent } from "#current/agent-plan.ts";
import type { CurrentSessionInvalid } from "#current/errors.ts";
import { type DecodedSession, decodeAgents, decodeSessions, type StoredAgent, type StoredSession } from "#current/reconcile-rows.ts";
import { planSettlements, type SessionExecutionSettlement } from "#current/settle-plan.ts";

export interface CurrentSessionReconcilePlan extends AgentReconcilePlan {
	readonly executionsToSettle: ReadonlyArray<SessionExecutionSettlement>;
}

type PlanFailure =
	| CurrentSessionInvalid
	| InvalidAgentTransition
	| InvalidSessionExecutionStatus
	| InvalidSessionExecutionTransition
	| StoredAgentSessionStatusInvalid
	| StoredAgentStatusInvalid;

export const planCurrentSessionReconciliation = (
	storedAgents: ReadonlyArray<StoredAgent>,
	storedSessions: ReadonlyArray<StoredSession>,
	attached: ReadonlySet<string>,
): Result.Result<CurrentSessionReconcilePlan, PlanFailure> => {
	const decodedAgents = decodeAgents(storedAgents);
	if (Result.isFailure(decodedAgents)) {
		return Result.fail(decodedAgents.failure);
	}
	const decodedSessions = decodeSessions(storedSessions);
	if (Result.isFailure(decodedSessions)) {
		return Result.fail(decodedSessions.failure);
	}
	const sessionsByAgent = new Map<string, Array<DecodedSession>>();
	const sessionIds = new Set<string>();
	for (const session of decodedSessions.success) {
		const owned = sessionsByAgent.get(session.agentId);
		if (owned === undefined) {
			sessionsByAgent.set(session.agentId, [session]);
		} else {
			owned.push(session);
		}
		sessionIds.add(session.id);
	}
	const agentsToReclaim: Array<AgentReconcilePlan["agentsToReclaim"][number]> = [];
	const pointers: Array<AgentReconcilePlan["pointers"][number]> = [];
	const sessionsToClose: Array<string> = [];
	for (const agent of decodedAgents.success) {
		const planned = planAgent(agent, sessionsByAgent.get(agent.id) ?? [], sessionIds);
		if (Result.isFailure(planned)) {
			return Result.fail(planned.failure);
		}
		agentsToReclaim.push(...planned.success.agentsToReclaim);
		pointers.push(...planned.success.pointers);
		sessionsToClose.push(...planned.success.sessionsToClose);
	}
	const agentIds = new Set(decodedAgents.success.map((agent) => agent.id));
	sessionsToClose.push(
		...decodedSessions.success.filter((session) => session.status === "open" && !agentIds.has(session.agentId)).map((session) => session.id),
	);
	const settled = planSettlements(decodedSessions.success, new Set(sessionsToClose), attached);
	if (Result.isFailure(settled)) {
		return Result.fail(settled.failure);
	}
	return Result.succeed({
		agentsToReclaim,
		executionsToSettle: settled.success,
		pointers,
		sessionsToClose,
	});
};
