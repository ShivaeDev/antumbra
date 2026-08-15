import { defineIntent } from "@antumbra/kernel";
import { Effect, Option, PubSub, Schema } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { AgentNotFound } from "#errors.ts";
import {
	type AgentStatus,
	AgentStatusSchema,
	agentTransition,
} from "#status.ts";

const RetirePayload = Schema.Struct({ agentId: Schema.String });
export type RetireFields = typeof RetirePayload.Type;

const closeRows = (deps: AgentDeps, agentId: string, next: AgentStatus) =>
	deps.writer.write(
		deps.db.Agent.where({ id: agentId })
			.update({ status: next })
			.pipe(
				Effect.andThen(
					deps.db.AgentSession.where({ agentId }).update({ status: "closed" }),
				),
			),
	);

const stopSessions = (deps: AgentDeps, agentId: string) =>
	Effect.gen(function* () {
		const sessions = yield* provideExecutors(deps)(
			deps.db.AgentSession.where({ agentId }).all(),
		);
		yield* Effect.forEach(sessions, (session) => deps.fabric.stop(session.id));
	});

const retireAgent = (deps: AgentDeps, agentId: string) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const agent = yield* provide(deps.db.Agent.where({ id: agentId }).first());
		if (Option.isNone(agent)) {
			return yield* new AgentNotFound({ agentId });
		}
		const status = yield* Effect.orDie(
			Schema.decodeUnknownEffect(AgentStatusSchema)(agent.value.status),
		);
		const next = yield* Effect.fromResult(agentTransition(status, "retire"));
		yield* stopSessions(deps, agentId);
		yield* provide(closeRows(deps, agentId, next));
		yield* PubSub.publish(deps.feeds.fleet, undefined);
	});
};

export const makeRetireKind = (deps: AgentDeps) =>
	defineIntent({
		execute: (payload) =>
			retireAgent(deps, payload.agentId).pipe(
				// why: a requeued retire that already completed lands on "retired" —
				// idempotent by treating the illegal re-transition as done.
				Effect.catchTag("InvalidAgentTransition", () => Effect.void),
			),
		payload: RetirePayload,
		reclaim: "requeue",
		tag: "agent/retire",
	});
