import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineIntent, IntentExecution } from "@antumbra/kernel";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	type AgentStatus,
	agentTransition,
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	sessionPresence,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, PubSub, Schema } from "effect";
import { AgentNotFound, AgentStillWorking } from "#errors.ts";
import { sessionRetirable } from "#session-at-rest.ts";
import { rootSessionsOf } from "#session-roots.ts";

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
	// why: retirement settles the Agent's whole Session subtree, subsessions
	// included — a closed root over a still-open child would claim the record
	// finished while part of it is unaccounted for.
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
	// why: only a root is attached to the fabric. A subsession lives inside its
	// root's provider conversation, so it has no attachment of its own to stop.
	const stopSessions = (agentId: string) =>
		Effect.gen(function* () {
			const sessions = yield* provide(
				db.AgentSession.where(rootSessionsOf(agentId)).all(),
			);
			yield* Effect.forEach(sessions, (session) =>
				Effect.fromResult(
					decodeStoredAgentSessionStatus(session.id, session.status),
				),
			);
			yield* Effect.forEach(sessions, (session) => fabric.stop(session.id));
		});
	// why: whoever submitted this read a capability off a snapshot, and a turn
	// may have begun since. The question is asked again here, of the present,
	// and it is the weak rule rather than rest: a tree still carrying a
	// delegated conversation, or one whose stream is long gone, is exactly what
	// retirement exists to close. Only an Agent with a turn under way right now
	// has work that ending it would sever.
	const refuseWorking = (agentId: string) =>
		Effect.gen(function* () {
			const attached = yield* fabric.attached;
			const sessions = yield* provide(
				db.AgentSession.where(rootSessionsOf(agentId)).all(),
			);
			for (const session of sessions) {
				const status = yield* Effect.fromResult(
					decodeStoredAgentSessionStatus(session.id, session.status),
				);
				const executionStatus = yield* Effect.fromResult(
					decodeSessionExecutionStatus(session.id, session.executionStatus),
				);
				const presence = sessionPresence({
					attached: attached.has(session.id),
					executionStatus,
					open: status === "open",
				});
				if (!sessionRetirable(presence)) {
					return yield* new AgentStillWorking({
						agentId,
						sessionId: session.id,
					});
				}
			}
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
			yield* refuseWorking(agentId);
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
