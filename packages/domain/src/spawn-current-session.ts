import { agentTransition, decodeStoredAgentSessionStatus, decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { AgentBirthStranded, AgentNotSpawnable, AgentSessionConflict } from "#errors.ts";
import type { SpawnFields } from "#spawn-fields.ts";

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
		const status = yield* Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status));
		if (status !== "spawning") {
			return yield* new AgentNotSpawnable({ agentId: agent.id, status });
		}
		if (agent.currentSessionId === payload.sessionId) {
			return "current" as const;
		}
		return agent.currentSessionId === null ? ("claim" as const) : yield* conflict(agent, payload);
	});

export const activationFor = (agent: StoredAgent, payload: SpawnFields) =>
	Effect.gen(function* () {
		if (agent.currentSessionId !== payload.sessionId) {
			return yield* conflict(agent, payload);
		}
		const status = yield* Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status));
		return status === "alive" ? null : yield* Effect.fromResult(agentTransition(status, "activate"));
	});

// why: settling a failed birth is only this attempt's business. An Agent past
// spawning was settled by someone else and needs nothing; one still spawning
// against another Session is a birth this attempt cannot reach and nobody else
// will come for — and a spawning Agent counts as at work for good, so that case
// is named rather than passed over in silence.
export const settlementFor = (agent: StoredAgent, payload: SpawnFields) =>
	Effect.gen(function* () {
		const status = yield* Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status));
		if (status !== "spawning") {
			return "settled" as const;
		}
		if (agent.currentSessionId === payload.sessionId) {
			return "reclaim" as const;
		}
		return yield* new AgentBirthStranded({
			agentId: agent.id,
			detail:
				agent.currentSessionId === null ? "it is spawning against no Session at all" : `it is spawning against Session ${agent.currentSessionId}`,
			sessionId: payload.sessionId,
		});
	});

export const ensureSessionStatus = (id: string, status: unknown) => Effect.fromResult(decodeStoredAgentSessionStatus(id, status));
