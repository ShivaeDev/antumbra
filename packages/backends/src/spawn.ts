import { defineIntent } from "@antumbra/kernel";
import { Clock, Effect, Option, Schema } from "effect";
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

export const makeSpawnKind = (deps: AgentDeps) => {
	const provide = provideExecutors(deps);
	return defineIntent({
		execute: (payload) =>
			Effect.gen(function* () {
				const backend = deps.backends.get(payload.backend);
				if (backend === undefined) {
					return yield* new UnknownBackendTag({ tag: payload.backend });
				}
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
						),
					);
				}
				const sink = yield* deps.sinkFor(payload.sessionId);
				const handle = yield* deps.fabric.start(
					backend,
					{ cwd: payload.cwd, resume: false, sessionId: payload.sessionId },
					sink,
				);
				const session = yield* provide(
					deps.db.AgentSession.where({ id: payload.sessionId }).first(),
				);
				const delivered =
					Option.isSome(session) && session.value.charterDeliveredAt !== null;
				if (!delivered) {
					yield* handle.send(payload.charter);
					const now = yield* Clock.currentTimeMillis;
					yield* provide(
						deps.writer.write(
							deps.db.AgentSession.where({ id: payload.sessionId }).update({
								charterDeliveredAt: new Date(now),
							}),
						),
					);
				}
			}),
		payload: SpawnPayload,
		// why: a stranded spawn's agent goes dormant at boot; requeueing it would
		// be revival, which v0 deliberately does not have.
		reclaim: "abandon",
		tag: "agent/spawn",
	});
};
