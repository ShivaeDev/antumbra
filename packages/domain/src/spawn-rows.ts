import type { ProvisionedMoorage } from "@antumbra/plugin-api";
import { Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { AgentNotSpawnable } from "#errors.ts";
import type { SpawnFields } from "#spawn.ts";

const assignToPiece = (deps: AgentDeps, payload: SpawnFields) => {
	const pieceId = payload.pieceId;
	if (pieceId === undefined) {
		return Effect.void;
	}
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const existing = yield* provide(
			deps.db.PieceAgent.where({ agentId: payload.agentId, pieceId }).first(),
		);
		if (Option.isSome(existing)) {
			return;
		}
		yield* provide(
			deps.writer.write(
				deps.db.PieceAgent.create({ agentId: payload.agentId, pieceId }),
			),
		);
		yield* PubSub.publish(deps.feeds.voyages, undefined);
	});
};

export const ensureAgentRow = (deps: AgentDeps, payload: SpawnFields) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const existing = yield* provide(
			deps.db.Agent.where({ id: payload.agentId }).first(),
		);
		if (Option.isSome(existing) && existing.value.status !== "alive") {
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
						status: "alive",
					}),
				),
			);
			// why: rows changed, so observers refresh now — a spawn that fails
			// later must still leave a visible agent, not a ghost.
			yield* PubSub.publish(deps.feeds.fleet, undefined);
		}
		yield* assignToPiece(deps, payload);
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
