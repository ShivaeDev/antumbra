import { defineIntent } from "@antumbra/kernel";
import type { SessionHandle } from "@antumbra/plugin-api";
import { Clock, Effect, Option, PubSub, Schema } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { AgentNotSpawnable, UnknownBackendTag } from "#errors.ts";

const SpawnPayload = Schema.Struct({
	agentId: Schema.String,
	backend: Schema.String,
	charter: Schema.String,
	cwd: Schema.String,
	role: Schema.String,
	sessionId: Schema.String,
});
export type SpawnFields = typeof SpawnPayload.Type;

const createRows = (deps: AgentDeps, payload: SpawnFields) =>
	deps.writer.write(
		deps.db.Agent.create({
			charter: payload.charter,
			id: payload.agentId,
			role: payload.role,
			status: "alive",
		}).pipe(
			Effect.andThen(
				deps.db.AgentSession.create({
					agentId: payload.agentId,
					charterDeliveredAt: null,
					cwd: payload.cwd,
					id: payload.sessionId,
					status: "open",
				}),
			),
		),
	);

const ensureRows = (deps: AgentDeps, payload: SpawnFields) => {
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
			yield* provide(createRows(deps, payload));
			// why: rows changed, so observers refresh now — a spawn that fails
			// later must still leave a visible agent, not a ghost.
			yield* PubSub.publish(deps.feeds.fleet, undefined);
		}
	});
};

const stampCharter = (deps: AgentDeps, payload: SpawnFields) =>
	Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		yield* provideExecutors(deps)(
			deps.writer.write(
				deps.db.AgentSession.where({ id: payload.sessionId }).update({
					charterDeliveredAt: new Date(now),
				}),
			),
		);
	});

const deliverCharterOnce = (
	deps: AgentDeps,
	payload: SpawnFields,
	handle: SessionHandle,
) =>
	Effect.gen(function* () {
		const session = yield* provideExecutors(deps)(
			deps.db.AgentSession.where({ id: payload.sessionId }).first(),
		);
		const delivered =
			Option.isSome(session) && session.value.charterDeliveredAt !== null;
		if (!delivered) {
			yield* handle.send(payload.charter);
			yield* stampCharter(deps, payload);
		}
	});

export const makeSpawnKind = (deps: AgentDeps) =>
	defineIntent({
		execute: (payload) =>
			Effect.gen(function* () {
				const backend = deps.backends.get(payload.backend);
				if (backend === undefined) {
					return yield* new UnknownBackendTag({ tag: payload.backend });
				}
				yield* ensureRows(deps, payload);
				const sink = yield* deps.sinkFor(payload.sessionId);
				const handle = yield* deps.fabric.start(
					backend,
					{ cwd: payload.cwd, resume: false, sessionId: payload.sessionId },
					sink,
				);
				yield* deliverCharterOnce(deps, payload, handle);
				yield* PubSub.publish(deps.feeds.fleet, undefined);
			}),
		payload: SpawnPayload,
		// why: a stranded spawn's agent goes dormant at boot; requeueing it would
		// be revival, which v0 deliberately does not have.
		reclaim: "abandon",
		tag: "agent/spawn",
	});
