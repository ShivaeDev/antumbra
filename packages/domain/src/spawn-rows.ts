import { Effect, Option, PubSub, Schema } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { AgentNotSpawnable } from "#errors.ts";
import { assignToPiece } from "#piece-assignment.ts";
import type { SpawnFields } from "#spawn.ts";
import {
	type AgentStatus,
	AgentStatusSchema,
	agentTransition,
} from "#status.ts";
import { assignToVoyage } from "#voyage-assignment.ts";

export const ensureAgentRow = (deps: AgentDeps, payload: SpawnFields) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const existing = yield* provide(
			deps.db.Agent.where({ id: payload.agentId }).first(),
		);
		if (Option.isSome(existing) && existing.value.status !== "spawning") {
			return yield* new AgentNotSpawnable({
				agentId: payload.agentId,
				status: existing.value.status,
			});
		}
		if (Option.isNone(existing)) {
			yield* provide(
				deps.writer.write(
					deps.db.Agent.create({
						charter: payload.charter,
						id: payload.agentId,
						role: payload.role,
						status: "spawning",
					}),
				),
			);
			// why: rows changed, so observers refresh now — a spawn that fails
			// later must still leave a visible agent, not a ghost.
			yield* PubSub.publish(deps.feeds.fleet, undefined);
		}
		yield* assignToPiece(deps, payload);
		yield* assignToVoyage(deps, payload);
	});
};

export const activateAgent = (deps: AgentDeps, agentId: string) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const agent = yield* provide(deps.db.Agent.where({ id: agentId }).first());
		if (Option.isNone(agent)) {
			return yield* new AgentNotSpawnable({ agentId, status: "missing" });
		}
		const status = yield* Effect.orDie(
			Schema.decodeUnknownEffect(AgentStatusSchema)(agent.value.status),
		);
		if (status === "alive") {
			return;
		}
		const next = yield* Effect.fromResult(agentTransition(status, "activate"));
		yield* provide(
			deps.writer.write(
				deps.db.Agent.where({ id: agentId }).update({ status: next }),
			),
		);
		yield* PubSub.publish(deps.feeds.fleet, undefined);
	});
};

const closeFailedSpawnRows = (
	deps: AgentDeps,
	payload: SpawnFields,
	status: AgentStatus,
) =>
	deps.db.Agent.where({ id: payload.agentId })
		.update({ status })
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
		const agent = yield* provide(
			deps.db.Agent.where({ id: payload.agentId }).first(),
		);
		if (Option.isNone(agent) || agent.value.status !== "spawning") {
			return;
		}
		const next = yield* Effect.fromResult(
			agentTransition("spawning", "reclaim"),
		);
		yield* deps.fabric.stop(payload.sessionId);
		yield* provide(
			deps.writer.write(closeFailedSpawnRows(deps, payload, next)),
		);
		yield* PubSub.publish(deps.feeds.fleet, undefined);
	});
};
