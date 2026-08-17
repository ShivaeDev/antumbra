import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
} from "@antumbra/agent-runtime-vocabulary";
import { defineIntent, IntentExecution } from "@antumbra/kernel";
import { Effect, Option, PubSub, Schema } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { AgentNotFound } from "#errors.ts";
import { ResourceReconciler } from "#resource-reconciler.ts";
import { type AgentStatus, agentTransition } from "#status.ts";

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
		yield* Effect.forEach(sessions, (session) =>
			Effect.fromResult(
				decodeStoredAgentSessionStatus(session.id, session.status),
			),
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
		const status = yield* Effect.fromResult(
			decodeStoredAgentStatus(agent.value.id, agent.value.status),
		);
		if (status === "retired") {
			return;
		}
		const next = yield* Effect.fromResult(agentTransition(status, "retire"));
		const execution = yield* IntentExecution;
		yield* execution.step("stop-sessions", stopSessions(deps, agentId));
		yield* execution.step(
			"close-records",
			provide(closeRows(deps, agentId, next)),
			{ additionalAttempts: 1 },
		);
		yield* execution.step(
			"publish-fleet",
			PubSub.publish(deps.feeds.fleet, undefined),
		);
	});
};

export const makeRetireKind = Effect.gen(function* () {
	const resources = yield* ResourceReconciler;
	return (deps: AgentDeps) =>
		defineIntent({
			execute: (payload) =>
				retireAgent(deps, payload.agentId).pipe(
					Effect.tap(() => resources.request),
				),
			payload: RetirePayload,
			reclaim: "requeue",
			tag: "agent/retire",
		});
});
