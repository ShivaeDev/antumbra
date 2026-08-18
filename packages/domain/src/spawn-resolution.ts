import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, PubSub } from "effect";
import { AgentNotSpawnable } from "#errors.ts";
import { SessionFabric } from "#fabric.ts";
import { activationFor, ensureSessionStatus } from "#spawn-current-session.ts";
import type { SpawnFields } from "#spawn-fields.ts";
import { type AgentStatus, agentTransition } from "#status.ts";

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
	const settleFailureRows = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const agent = yield* db.Agent.where({
				id: payload.agentId,
			}).first();
			if (Option.isNone(agent)) {
				return false;
			}
			const status = yield* Effect.fromResult(
				decodeStoredAgentStatus(agent.value.id, agent.value.status),
			);
			if (
				status !== "spawning" ||
				agent.value.currentSessionId !== payload.sessionId
			) {
				return false;
			}
			const session = yield* db.AgentSession.where({
				id: payload.sessionId,
			}).first();
			if (Option.isSome(session)) {
				yield* ensureSessionStatus(session.value.id, session.value.status);
			}
			const next = yield* Effect.fromResult(agentTransition(status, "reclaim"));
			yield* closeFailedRows(payload, next);
			return true;
		});
	const settleFailure = (payload: SpawnFields) =>
		Effect.gen(function* () {
			yield* fabric.stop(payload.sessionId);
			const changed = yield* provide(writer.write(settleFailureRows(payload)));
			if (changed) {
				yield* PubSub.publish(feeds.fleet, undefined);
			}
		});
	return { activate, settleFailure };
});
