import {
	type AgentSessionStatus,
	type AgentStatus,
	type BerthStatus,
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	decodeStoredBerthStatus,
	decodeStoredMoorageStatus,
	type MoorageStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Result } from "effect";
import { decodeSessionExecutionStatus } from "#session-execution-status.ts";
import type { SpawnFields } from "#spawn-fields.ts";

interface StoredAgent {
	readonly charter: string;
	readonly currentSessionId: string | null;
	readonly id: string;
	readonly role: string;
	readonly status: unknown;
}

interface StoredBerth {
	readonly id: string;
	readonly runner: string;
	readonly status: unknown;
}

interface StoredMoorage {
	readonly agentId: string;
	readonly root: string;
	readonly runner: string;
	readonly status: unknown;
}

interface StoredSession {
	readonly agentId: string;
	readonly backend: string;
	readonly charterDeliveredAt: Date | null;
	readonly cwd: string;
	readonly executionStatus: unknown;
	readonly id: string;
	readonly nativeRef: string | null;
	readonly status: unknown;
}

const agentMatches = (
	row: StoredAgent & { readonly status: AgentStatus },
	payload: SpawnFields,
) =>
	row.status === "alive" &&
	row.charter === payload.charter &&
	row.currentSessionId === payload.sessionId &&
	row.role === payload.role;

const sessionMatches = (
	row: StoredSession & { readonly status: AgentSessionStatus },
	payload: SpawnFields,
) => {
	const executionStatus = decodeSessionExecutionStatus(
		payload.sessionId,
		row.executionStatus,
	);
	return (
		row.agentId === payload.agentId &&
		row.backend === payload.backend &&
		row.status === "open" &&
		Result.isSuccess(executionStatus) &&
		executionStatus.success === "active" &&
		row.nativeRef !== null &&
		row.charterDeliveredAt !== null
	);
};

const moorageMatches = (
	row: StoredMoorage & { readonly status: MoorageStatus },
	session: StoredSession,
	payload: SpawnFields,
) =>
	row.runner === payload.runner &&
	row.status === "ready" &&
	row.root === session.cwd;

const berthMatches = (
	row: StoredBerth & { readonly status: BerthStatus },
	payload: SpawnFields,
) => row.runner === payload.runner && row.status === "ready";

export const storedAgentMatches = (row: StoredAgent, payload: SpawnFields) =>
	Effect.fromResult(decodeStoredAgentStatus(row.id, row.status)).pipe(
		Effect.map((status) => agentMatches({ ...row, status }, payload)),
	);

export const storedResourcesMatch = (
	session: StoredSession,
	moorage: StoredMoorage,
	payload: SpawnFields,
) =>
	Effect.all({
		moorage: Effect.fromResult(
			decodeStoredMoorageStatus(moorage.agentId, moorage.status),
		),
		session: Effect.fromResult(
			decodeStoredAgentSessionStatus(session.id, session.status),
		),
	}).pipe(
		Effect.map(
			(statuses) =>
				sessionMatches({ ...session, status: statuses.session }, payload) &&
				moorageMatches(
					{ ...moorage, status: statuses.moorage },
					session,
					payload,
				),
		),
	);

export const storedBerthsMatch = (
	berths: ReadonlyArray<StoredBerth>,
	payload: SpawnFields,
) =>
	Effect.forEach(berths, (berth) =>
		Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)).pipe(
			Effect.map((status) => berthMatches({ ...berth, status }, payload)),
		),
	).pipe(Effect.map((matches) => matches.every(Boolean)));
