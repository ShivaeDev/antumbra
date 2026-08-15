import type { ProvisionedMoorage } from "@antumbra/plugin-api";
import { Effect, Option, PubSub, Schema } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { AgentNotSpawnable } from "#errors.ts";
import type { SpawnFields } from "#spawn.ts";
import {
	type AgentStatus,
	AgentStatusSchema,
	agentTransition,
} from "#status.ts";

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

const berthRows = (
	deps: AgentDeps,
	payload: SpawnFields,
	moorage: ProvisionedMoorage,
) =>
	Effect.forEach(moorage.berths, (berth) =>
		deps.db.Berth.create({
			agentId: payload.agentId,
			branch: berth.branch,
			id: `${payload.agentId}:${berth.slug}`,
			path: berth.path,
			ref: berth.ref,
			runner: payload.runner,
			slug: berth.slug,
			source: berth.source,
			status: "ready",
			strandedAt: null,
		}),
	);

export const recordMoorage = (
	deps: AgentDeps,
	payload: SpawnFields,
	moorage: ProvisionedMoorage,
) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const session = yield* provide(
			deps.db.AgentSession.where({ id: payload.sessionId }).first(),
		);
		if (Option.isNone(session)) {
			yield* provide(
				deps.writer.write(
					deps.db.AgentSession.create({
						agentId: payload.agentId,
						backend: payload.backend,
						charterDeliveredAt: null,
						cwd: moorage.root,
						id: payload.sessionId,
						nativeRef: null,
						status: "open",
					}).pipe(Effect.andThen(berthRows(deps, payload, moorage))),
				),
			);
			yield* PubSub.publish(deps.feeds.fleet, undefined);
		}
	});
};
