import type { StoredAgentSession } from "@antumbra/persistence";
import {
	decodeSessionExecutionStatus,
	type InvalidSessionExecutionStatus,
	type SessionExecutionStatus,
} from "@antumbra/platform-vocabulary/agent-runtime/session-execution.ts";
import type { AgentSessionStatus, AgentStatus } from "@antumbra/platform-vocabulary/agent-runtime/statuses.ts";
import { decodeStoredAgentStatus } from "@antumbra/platform-vocabulary/agent-runtime/stored.ts";
import { decodeStoredAgentSessionStatus, type StoredAgentSessionStatusInvalid } from "@antumbra/platform-vocabulary/agent-runtime/stored-session.ts";
import { Result } from "effect";

export interface StoredAgent {
	readonly currentSessionId: string | null;
	readonly id: string;
	readonly status: unknown;
}

export type StoredSession = Pick<StoredAgentSession, "agentId" | "createdAt" | "executionStatus" | "id" | "status">;

export interface DecodedAgent extends StoredAgent {
	readonly status: AgentStatus;
}

export interface DecodedSession extends StoredSession {
	readonly executionStatus: SessionExecutionStatus;
	readonly status: AgentSessionStatus;
}

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
