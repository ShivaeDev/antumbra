import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { AgentNotSpawnable, AgentSessionConflict } from "#errors.ts";
import type { SpawnFields } from "#spawn-fields.ts";
import { agentTransition } from "#status.ts";

interface StoredAgent {
	readonly currentSessionId: string | null;
	readonly id: string;
	readonly status: unknown;
}

const conflict = (agent: StoredAgent, payload: SpawnFields) =>
	new AgentSessionConflict({
		agentId: agent.id,
		currentSessionId: agent.currentSessionId,
		sessionId: payload.sessionId,
	});

export const reservationFor = (agent: StoredAgent, payload: SpawnFields) =>
	Effect.gen(function* () {
		const status = yield* Effect.fromResult(
			decodeStoredAgentStatus(agent.id, agent.status),
		);
		if (status !== "spawning") {
			return yield* new AgentNotSpawnable({ agentId: agent.id, status });
		}
		if (agent.currentSessionId === payload.sessionId) {
			return "current" as const;
		}
		return agent.currentSessionId === null
			? ("claim" as const)
			: yield* conflict(agent, payload);
	});

export const activationFor = (agent: StoredAgent, payload: SpawnFields) =>
	Effect.gen(function* () {
		if (agent.currentSessionId !== payload.sessionId) {
			return yield* conflict(agent, payload);
		}
		const status = yield* Effect.fromResult(
			decodeStoredAgentStatus(agent.id, agent.status),
		);
		return status === "alive"
			? null
			: yield* Effect.fromResult(agentTransition(status, "activate"));
	});

export const ensureSessionStatus = (id: string, status: unknown) =>
	Effect.fromResult(decodeStoredAgentSessionStatus(id, status));
