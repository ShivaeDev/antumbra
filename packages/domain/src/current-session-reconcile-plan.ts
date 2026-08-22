import {
	type AgentStatus,
	agentTransition,
	type InvalidAgentTransition,
	type StoredAgentSessionStatusInvalid,
	type StoredAgentStatusInvalid,
} from "@antumbra/vocabulary/agent-runtime";
import { Result } from "effect";
import { CurrentSessionInvalid } from "#current-session-errors.ts";
import { newestSession } from "#current-session-order.ts";
import {
	type DecodedAgent,
	type DecodedSession,
	decodeAgents,
	decodeSessions,
	type StoredAgent,
	type StoredSession,
} from "#current-session-reconcile-rows.ts";

export interface CurrentSessionReconcilePlan {
	readonly agentsToReclaim: ReadonlyArray<{
		readonly agentId: string;
		readonly status: AgentStatus;
	}>;
	readonly pointers: ReadonlyArray<{
		readonly agentId: string;
		readonly currentSessionId: string | null;
	}>;
	readonly sessionsToClose: ReadonlyArray<string>;
}

type PlanFailure =
	| CurrentSessionInvalid
	| InvalidAgentTransition
	| StoredAgentSessionStatusInvalid
	| StoredAgentStatusInvalid;

const planAgent = (
	agent: DecodedAgent,
	owned: ReadonlyArray<DecodedSession>,
	allSessions: ReadonlyArray<DecodedSession>,
): Result.Result<
	CurrentSessionReconcilePlan,
	CurrentSessionInvalid | InvalidAgentTransition
> => {
	const open = owned.filter((session) => session.status === "open");
	if (agent.status === "dormant" || agent.status === "retired") {
		return Result.succeed({
			agentsToReclaim: [],
			pointers:
				agent.currentSessionId === null
					? []
					: [{ agentId: agent.id, currentSessionId: null }],
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
					agentsToReclaim: [{ agentId: agent.id, status: reclaimed.success }],
					pointers: [],
					sessionsToClose: [],
				});
	}
	const current = owned.find((session) => session.id === currentId);
	const reservedBirth =
		agent.status === "spawning" &&
		!allSessions.some((session) => session.id === currentId);
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
		pointers:
			agent.currentSessionId === null
				? [{ agentId: agent.id, currentSessionId: currentId }]
				: [],
		sessionsToClose: open
			.filter((session) => session.id !== currentId)
			.map((session) => session.id),
	});
};

export const planCurrentSessionReconciliation = (
	storedAgents: ReadonlyArray<StoredAgent>,
	storedSessions: ReadonlyArray<StoredSession>,
): Result.Result<CurrentSessionReconcilePlan, PlanFailure> => {
	const decodedAgents = decodeAgents(storedAgents);
	if (Result.isFailure(decodedAgents)) {
		return Result.fail(decodedAgents.failure);
	}
	const decodedSessions = decodeSessions(storedSessions);
	if (Result.isFailure(decodedSessions)) {
		return Result.fail(decodedSessions.failure);
	}
	const agentsToReclaim: Array<
		CurrentSessionReconcilePlan["agentsToReclaim"][number]
	> = [];
	const pointers: Array<CurrentSessionReconcilePlan["pointers"][number]> = [];
	const sessionsToClose: Array<string> = [];
	for (const agent of decodedAgents.success) {
		const planned = planAgent(
			agent,
			decodedSessions.success.filter((session) => session.agentId === agent.id),
			decodedSessions.success,
		);
		if (Result.isFailure(planned)) {
			return planned;
		}
		agentsToReclaim.push(...planned.success.agentsToReclaim);
		pointers.push(...planned.success.pointers);
		sessionsToClose.push(...planned.success.sessionsToClose);
	}
	const agentIds = new Set(decodedAgents.success.map((agent) => agent.id));
	sessionsToClose.push(
		...decodedSessions.success
			.filter(
				(session) =>
					session.status === "open" && !agentIds.has(session.agentId),
			)
			.map((session) => session.id),
	);
	return Result.succeed({ agentsToReclaim, pointers, sessionsToClose });
};
