import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import { AgentNotFound, decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { AgentSessionConflict } from "#current/errors.ts";

interface RootRegistration {
	readonly agentId: string;
	readonly backend: string;
	readonly sessionId: string;
}

export const ensureRoot = Effect.fn("SessionRegistration.ensureRoot")(function* (registration: RootRegistration, cwd: string) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const { agentId, backend, sessionId } = registration;
	const agent = yield* db.Agent.where({ id: agentId }).first();
	if (Option.isNone(agent)) {
		return yield* new AgentNotFound({ agentId });
	}
	const currentSessionId = agent.value.currentSessionId;
	if (currentSessionId !== sessionId) {
		return yield* new AgentSessionConflict({ agentId, currentSessionId, sessionId });
	}
	const session = yield* db.AgentSession.where({ id: sessionId }).first();
	if (Option.isSome(session)) {
		const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(session.value.id, session.value.status));
		if (session.value.agentId !== agentId || status !== "open") {
			return yield* new AgentSessionConflict({ agentId, currentSessionId, sessionId });
		}
		return;
	}
	yield* db.AgentSession.create({
		agentId,
		backend,
		charterDeliveredAt: null,
		completeness: "recording",
		cwd,
		executionStatus: "active",
		id: sessionId,
		kind: null,
		label: null,
		nativeRef: null,
		outcome: null,
		parentSessionId: null,
		rootSessionId: sessionId,
		status: "open",
	} satisfies NewAgentSession);
	yield* feeds.publishFleetRefresh();
	yield* feeds.publishVoyageRefresh();
});
