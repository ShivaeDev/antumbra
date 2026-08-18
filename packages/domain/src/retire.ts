import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineIntent, IntentExecution } from "@antumbra/kernel";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, PubSub, Schema } from "effect";
import { AgentNotFound } from "#errors.ts";
import { SessionFabric } from "#fabric.ts";
import { ResourceReconciler } from "#resource-reconciler.ts";
import { type AgentStatus, agentTransition } from "#status.ts";

const RetirePayload = Schema.Struct({ agentId: Schema.String });
export type RetireFields = typeof RetirePayload.Type;

export const makeRetireKind = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const fabric = yield* SessionFabric;
	const resources = yield* ResourceReconciler;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const closeRows = (agentId: string, next: AgentStatus) =>
		writer.write(
			db.Agent.where({ id: agentId })
				.update({ currentSessionId: null, status: next })
				.pipe(
					Effect.andThen(
						db.AgentSession.where({ agentId }).update({ status: "closed" }),
					),
				),
		);
	const stopSessions = (agentId: string) =>
		Effect.gen(function* () {
			const sessions = yield* provide(db.AgentSession.where({ agentId }).all());
			yield* Effect.forEach(sessions, (session) =>
				Effect.fromResult(
					decodeStoredAgentSessionStatus(session.id, session.status),
				),
			);
			yield* Effect.forEach(sessions, (session) => fabric.stop(session.id));
		});
	const retireAgent = (agentId: string) =>
		Effect.gen(function* () {
			const agent = yield* provide(db.Agent.where({ id: agentId }).first());
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
			yield* execution.step("stop-sessions", stopSessions(agentId));
			yield* execution.step(
				"close-records",
				provide(closeRows(agentId, next)),
				{
					additionalAttempts: 1,
				},
			);
			yield* execution.step(
				"publish-fleet",
				PubSub.publish(feeds.fleet, undefined),
			);
		});
	return defineIntent({
		execute: (payload) =>
			retireAgent(payload.agentId).pipe(Effect.tap(() => resources.request)),
		payload: RetirePayload,
		reclaim: "requeue",
		tag: "agent/retire",
	});
});
