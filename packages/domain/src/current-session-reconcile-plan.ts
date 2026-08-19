import {
	type AgentSessionStatus,
	type AgentStatus,
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	type StoredAgentSessionStatusInvalid,
	type StoredAgentStatusInvalid,
} from "@antumbra/vocabulary/agent-runtime";
import { Result } from "effect";
import { CurrentSessionInvalid } from "#current-session-errors.ts";
import { newestSession } from "#current-session-order.ts";

interface StoredAgent {
	readonly currentSessionId: string | null;
	readonly id: string;
	readonly status: unknown;
}

interface StoredSession {
	readonly agentId: string;
	readonly createdAt: Date;
	readonly id: string;
	readonly status: unknown;
}

interface DecodedAgent extends StoredAgent {
	readonly status: AgentStatus;
}

interface DecodedSession extends StoredSession {
	readonly status: AgentSessionStatus;
}

export interface CurrentSessionReconcilePlan {
	readonly pointers: ReadonlyArray<{
		readonly agentId: string;
		readonly currentSessionId: string | null;
	}>;
	readonly sessionsToClose: ReadonlyArray<string>;
}

type PlanFailure =
	| CurrentSessionInvalid
	| StoredAgentSessionStatusInvalid
	| StoredAgentStatusInvalid;

const decodeAgents = (stored: ReadonlyArray<StoredAgent>) => {
	const decoded: Array<DecodedAgent> = [];
	for (const agent of stored) {
		const status = decodeStoredAgentStatus(agent.id, agent.status);
		if (Result.isFailure(status)) {
			return Result.fail(status.failure);
		}
		decoded.push({ ...agent, status: status.success });
	}
	return Result.succeed(decoded);
};

const decodeSessions = (stored: ReadonlyArray<StoredSession>) => {
	const decoded: Array<DecodedSession> = [];
	for (const session of stored) {
		const status = decodeStoredAgentSessionStatus(session.id, session.status);
		if (Result.isFailure(status)) {
			return Result.fail(status.failure);
		}
		decoded.push({ ...session, status: status.success });
	}
	return Result.succeed(decoded);
};

const planAgent = (
	agent: DecodedAgent,
	owned: ReadonlyArray<DecodedSession>,
	allSessions: ReadonlyArray<DecodedSession>,
): Result.Result<CurrentSessionReconcilePlan, CurrentSessionInvalid> => {
	const open = owned.filter((session) => session.status === "open");
	if (agent.status === "dormant" || agent.status === "retired") {
		return Result.succeed({
			pointers:
				agent.currentSessionId === null
					? []
					: [{ agentId: agent.id, currentSessionId: null }],
			sessionsToClose: open.map((session) => session.id),
		});
	}
	const currentId = agent.currentSessionId ?? newestSession(open)?.id ?? null;
	const current = owned.find((session) => session.id === currentId);
	const reservedBirth =
		agent.status === "spawning" &&
		currentId !== null &&
		!allSessions.some((session) => session.id === currentId);
	if (currentId !== null && !reservedBirth && current?.status !== "open") {
		return Result.fail(
			new CurrentSessionInvalid({
				agentId: agent.id,
				detail: `${currentId} is missing or closed`,
			}),
		);
	}
	return Result.succeed({
		pointers:
			agent.currentSessionId === null && currentId !== null
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
	return Result.succeed({ pointers, sessionsToClose });
};
