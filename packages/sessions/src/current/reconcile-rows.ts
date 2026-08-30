import type { StoredAgentSession } from "@antumbra/persistence";
import {
	type AgentSessionStatus,
	type AgentStatus,
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	type InvalidSessionExecutionStatus,
	type SessionExecutionStatus,
	type StoredAgentSessionStatusInvalid,
} from "@antumbra/vocabulary/agent-runtime";
import { Result } from "effect";

export interface StoredAgent {
	readonly currentSessionId: string | null;
	readonly id: string;
	readonly status: unknown;
}

// why: the reconciler reads roots only, and the fields it reads are the stored
// ones — deriving the shape keeps a column change a compile error here.
export type StoredSession = Pick<StoredAgentSession, "agentId" | "createdAt" | "executionStatus" | "id" | "status">;

export interface DecodedAgent extends StoredAgent {
	readonly status: AgentStatus;
}

export interface DecodedSession extends StoredSession {
	readonly executionStatus: SessionExecutionStatus;
	readonly status: AgentSessionStatus;
}

// why: the plan reasons in vocabulary, never in stored strings, so every row is
// read as a word before any of it is weighed — and one row nobody can read
// stops the whole pass rather than being quietly planned around.
export const decodeAgents = (stored: ReadonlyArray<StoredAgent>) => {
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

export const decodeSessions = (
	stored: ReadonlyArray<StoredSession>,
): Result.Result<ReadonlyArray<DecodedSession>, InvalidSessionExecutionStatus | StoredAgentSessionStatusInvalid> => {
	const decoded: Array<DecodedSession> = [];
	for (const session of stored) {
		const status = decodeStoredAgentSessionStatus(session.id, session.status);
		if (Result.isFailure(status)) {
			return Result.fail(status.failure);
		}
		const executionStatus = decodeSessionExecutionStatus(session.id, session.executionStatus);
		if (Result.isFailure(executionStatus)) {
			return Result.fail(executionStatus.failure);
		}
		decoded.push({
			...session,
			executionStatus: executionStatus.success,
			status: status.success,
		});
	}
	return Result.succeed(decoded);
};
