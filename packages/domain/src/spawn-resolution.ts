import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	type AgentStatus,
	agentTransition,
	decodeStoredAgentStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { AgentNotSpawnable } from "#errors.ts";
import {
	activationFor,
	ensureSessionStatus,
	settlementFor,
} from "#spawn-current-session.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const spawnResolution = Effect.gen(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const feeds = yield* DomainFeeds;
	const activateRows = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const stored = yield* db.Agent.where({
				id: payload.agentId,
			}).first();
			if (Option.isNone(stored)) {
				return yield* new AgentNotSpawnable({
					agentId: payload.agentId,
					status: "missing",
				});
			}
			const next = yield* activationFor(stored.value, payload);
			if (next === null) {
				return false;
			}
			const updated = yield* db.Agent.where({
				currentSessionId: payload.sessionId,
				id: payload.agentId,
				status: stored.value.status,
			}).update({ status: next });
			return updated !== null;
		});
	const activate = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const changed = yield* activateRows(payload);
			if (changed) {
				yield* feeds.publishFleetRefresh();
			}
		});
	const settleAgent = (payload: SpawnFields, status: AgentStatus) =>
		db.Agent.where({
			currentSessionId: payload.sessionId,
			id: payload.agentId,
			status: "spawning",
		}).update({ currentSessionId: null, status });
	const closeFailedSession = (payload: SpawnFields) =>
		db.AgentSession.where({ id: payload.sessionId, status: "open" }).update({
			status: "closed",
		});
	// why: the link registration wrote is a claim staked before the birth, not a
	// record of crew that served. assignedExecution already passes over an
	// assignment whose Agent is not alive, so withdrawing the claim costs
	// dispatch nothing and is what stops a Piece collecting one dormant Agent
	// for every attempt that never drew breath.
	const releaseClaim = (payload: SpawnFields) => {
		const pieceId = payload.pieceId;
		return pieceId === undefined
			? Effect.void
			: db.PieceAgent.where({
					agentId: payload.agentId,
					pieceId,
				}).deleteAll();
	};
	const settleFailureRows = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const agent = yield* db.Agent.where({
				id: payload.agentId,
			}).first();
			if (Option.isNone(agent)) {
				return false;
			}
			const settlement = yield* settlementFor(agent.value, payload);
			const status = yield* Effect.fromResult(
				decodeStoredAgentStatus(agent.value.id, agent.value.status),
			);
			if (settlement === "settled" && status !== "dormant") {
				return false;
			}
			const session = yield* db.AgentSession.where({
				id: payload.sessionId,
			}).first();
			if (Option.isSome(session)) {
				yield* ensureSessionStatus(session.value.id, session.value.status);
			}
			if (settlement === "reclaim") {
				const next = yield* Effect.fromResult(
					agentTransition("spawning", "reclaim"),
				);
				yield* settleAgent(payload, next);
			}
			yield* closeFailedSession(payload);
			yield* releaseClaim(payload);
			return true;
		});
	const settleFailure = (payload: SpawnFields) =>
		Effect.gen(function* () {
			yield* fabric.stop(payload.sessionId);
			const changed = yield* settleFailureRows(payload);
			if (changed) {
				yield* feeds.publishFleetRefresh();
				yield* feeds.publishVoyageRefresh();
			}
		});
	return { activate, settleFailure };
});
