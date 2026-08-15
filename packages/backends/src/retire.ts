import { defineIntent } from "@antumbra/kernel";
import { Effect, Option, Schema } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { AgentNotFound } from "#errors.ts";
import { AgentStatusSchema, agentTransition } from "#status.ts";

const RetirePayload = Schema.Struct({ agentId: Schema.String });
export type RetireFields = typeof RetirePayload.Type;

export const makeRetireKind = (deps: AgentDeps) => {
	const provide = provideExecutors(deps);
	return defineIntent({
		execute: (payload) =>
			Effect.gen(function* () {
				const agent = yield* provide(
					deps.db.Agent.where({ id: payload.agentId }).first(),
				);
				if (Option.isNone(agent)) {
					return yield* new AgentNotFound({ agentId: payload.agentId });
				}
				const status = yield* Effect.orDie(
					Schema.decodeUnknownEffect(AgentStatusSchema)(agent.value.status),
				);
				const next = yield* Effect.fromResult(
					agentTransition(status, "retire"),
				);
				const sessions = yield* provide(
					deps.db.AgentSession.where({ agentId: payload.agentId }).all(),
				);
				yield* Effect.forEach(sessions, (session) =>
					deps.fabric.stop(session.id),
				);
				yield* provide(
					deps.writer.write(
						deps.db.Agent.where({ id: payload.agentId })
							.update({ status: next })
							.pipe(
								Effect.andThen(
									deps.db.AgentSession.where({
										agentId: payload.agentId,
									}).update({ status: "closed" }),
								),
							),
					),
				);
			}).pipe(
				// why: a requeued retire that already completed lands on "retired" —
				// idempotent by treating the illegal re-transition as done.
				Effect.catchTag("InvalidAgentTransition", () => Effect.void),
			),
		payload: RetirePayload,
		reclaim: "requeue",
		tag: "agent/retire",
	});
};
