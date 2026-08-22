import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	type AgentStatus,
	agentTransition,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, PubSub } from "effect";
import { AgentNotSpawnable } from "#errors.ts";
import {
	activationFor,
	ensureSessionStatus,
	settlementFor,
} from "#spawn-current-session.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const spawnResolution = Effect.gen(function* () {
	const db = yield* Database;
	const executors = yield* Effect.context<WriteExecutors>();
	const fabric = yield* SessionFabric;
	const feeds = yield* DomainFeeds;
	const writer = yield* Writer;
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
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
			yield* db.Agent.where({ id: payload.agentId }).update({ status: next });
			return true;
		});
	const activate = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const changed = yield* provide(writer.write(activateRows(payload)));
			if (changed) {
				yield* PubSub.publish(feeds.fleet, undefined);
			}
		});
	const closeFailedRows = (payload: SpawnFields, status: AgentStatus) =>
		db.Agent.where({ id: payload.agentId })
			.update({ currentSessionId: null, status })
			.pipe(
				Effect.andThen(
					db.AgentSession.where({ id: payload.sessionId }).update({
						status: "closed",
					}),
				),
			);
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
			if (settlement === "settled") {
				return false;
			}
			const session = yield* db.AgentSession.where({
				id: payload.sessionId,
			}).first();
			if (Option.isSome(session)) {
				yield* ensureSessionStatus(session.value.id, session.value.status);
			}
			const next = yield* Effect.fromResult(
				agentTransition("spawning", "reclaim"),
			);
			yield* closeFailedRows(payload, next);
			yield* releaseClaim(payload);
			return true;
		});
	const settleFailure = (payload: SpawnFields) =>
		Effect.gen(function* () {
			yield* fabric.stop(payload.sessionId);
			const changed = yield* provide(writer.write(settleFailureRows(payload)));
			if (changed) {
				yield* PubSub.publish(feeds.fleet, undefined);
				yield* PubSub.publish(feeds.voyages, undefined);
			}
		});
	return { activate, settleFailure };
});
