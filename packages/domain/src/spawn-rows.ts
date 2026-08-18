import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { AgentNotSpawnable } from "#errors.ts";
import { assignToPiece } from "#piece-assignment.ts";
import type { SpawnFields } from "#spawn.ts";
import {
	activationFor,
	ensureSessionStatus,
	reservationFor,
} from "#spawn-current-session.ts";
import { type AgentStatus, agentTransition } from "#status.ts";
import { assignToVoyage } from "#voyage-assignment.ts";

export const ensureAgentRow = (deps: AgentDeps, payload: SpawnFields) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const changed = yield* provide(
			deps.writer.write(
				Effect.gen(function* () {
					const stored = yield* deps.db.Agent.where({
						id: payload.agentId,
					}).first();
					if (Option.isNone(stored)) {
						yield* deps.db.Agent.create({
							charter: payload.charter,
							currentSessionId: payload.sessionId,
							id: payload.agentId,
							role: payload.role,
							status: "spawning",
						});
						return true;
					}
					const reservation = yield* reservationFor(stored.value, payload);
					if (reservation === "current") {
						return false;
					}
					yield* deps.db.Agent.where({
						currentSessionId: null,
						id: payload.agentId,
					}).update({ currentSessionId: payload.sessionId });
					return true;
				}),
			),
		);
		if (changed) {
			yield* PubSub.publish(deps.feeds.fleet, undefined);
			yield* PubSub.publish(deps.feeds.voyages, undefined);
		}
		yield* assignToPiece(deps, payload);
		yield* assignToVoyage(deps, payload);
	});
};

export const activateAgent = (deps: AgentDeps, payload: SpawnFields) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const changed = yield* provide(
			deps.writer.write(
				Effect.gen(function* () {
					const stored = yield* deps.db.Agent.where({
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
					yield* deps.db.Agent.where({ id: payload.agentId }).update({
						status: next,
					});
					return true;
				}),
			),
		);
		if (changed) {
			yield* PubSub.publish(deps.feeds.fleet, undefined);
		}
	});
};

const closeFailedSpawnRows = (
	deps: AgentDeps,
	payload: SpawnFields,
	status: AgentStatus,
) =>
	deps.db.Agent.where({ id: payload.agentId })
		.update({ currentSessionId: null, status })
		.pipe(
			Effect.andThen(
				deps.db.AgentSession.where({ id: payload.sessionId }).update({
					status: "closed",
				}),
			),
		);

export const settleSpawnFailure = (deps: AgentDeps, payload: SpawnFields) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		yield* deps.fabric.stop(payload.sessionId);
		const changed = yield* provide(
			deps.writer.write(
				Effect.gen(function* () {
					const agent = yield* deps.db.Agent.where({
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
					const session = yield* deps.db.AgentSession.where({
						id: payload.sessionId,
					}).first();
					if (Option.isSome(session)) {
						yield* ensureSessionStatus(session.value.id, session.value.status);
					}
					const next = yield* Effect.fromResult(
						agentTransition(status, "reclaim"),
					);
					yield* closeFailedSpawnRows(deps, payload, next);
					return true;
				}),
			),
		);
		if (changed) {
			yield* PubSub.publish(deps.feeds.fleet, undefined);
		}
	});
};
