import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { agentTransition, decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime.ts";
import { Effect, Option } from "effect";
import { ensureSessionStatus, settlementFor } from "#agent-birth/current-session.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const settleFailure = Effect.fn("AgentBirth.settleFailure")(function* (payload: SpawnFields) {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const feeds = yield* DomainFeeds;
	yield* fabric.stop(payload.sessionId);
	const agent = yield* db.Agent.where({ id: payload.agentId }).first();
	if (Option.isNone(agent)) {
		return;
	}
	const settlement = yield* settlementFor(agent.value, payload);
	const status = yield* Effect.fromResult(decodeStoredAgentStatus(agent.value.id, agent.value.status));
	if (settlement === "settled" && status !== "dormant") {
		return;
	}
	const session = yield* db.AgentSession.where({ id: payload.sessionId }).first();
	if (Option.isSome(session)) {
		yield* ensureSessionStatus(session.value.id, session.value.status);
	}
	if (settlement === "reclaim") {
		const next = yield* Effect.fromResult(agentTransition("spawning", "reclaim"));
		yield* db.Agent.where({ currentSessionId: payload.sessionId, id: payload.agentId, status: "spawning" }).update({
			currentSessionId: null,
			status: next,
		});
	}
	yield* db.AgentSession.where({ id: payload.sessionId, status: "open" }).update({ status: "closed" });
	if (payload.pieceId !== undefined) {
		yield* db.PieceAgent.where({ agentId: payload.agentId, pieceId: payload.pieceId }).deleteAll();
	}
	yield* feeds.publishFleetRefresh();
	yield* feeds.publishVoyageRefresh();
});
