import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineIntent, IntentExecution } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { SessionFabric } from "@antumbra/session-fabric";
import { rootSessionsOf, sessionRetirable } from "@antumbra/sessions";
import {
	type AgentStatus,
	agentTransition,
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	sessionPresence,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, Schema } from "effect";
import { AgentNotFound, AgentStillWorking } from "#errors.ts";

const RetirePayload = Schema.Struct({ agentId: Schema.String });
export type RetireFields = typeof RetirePayload.Type;

export const makeRetireKind = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const fabric = yield* SessionFabric;
	const resources = yield* ResourceReconciler;
	const closeAgent = (agentId: string, current: AgentStatus, next: AgentStatus) =>
		db.Agent.where({ id: agentId, status: current }).update({
			currentSessionId: null,
			status: next,
		});
	const closeSessions = (agentId: string) =>
		db.AgentSession.where({ agentId, status: "open" }).update({
			status: "closed",
		});
	const stopSessions = (agentId: string) =>
		Effect.gen(function* () {
			const sessions = yield* db.AgentSession.where(rootSessionsOf(agentId)).all();
			yield* Effect.forEach(sessions, (session) => Effect.fromResult(decodeStoredAgentSessionStatus(session.id, session.status)));
			yield* Effect.forEach(sessions, (session) => fabric.stop(session.id));
		});
	// Retirement may close a stranded tree; only work currently in flight refuses it.
	const refuseWorking = (agentId: string) =>
		Effect.gen(function* () {
			const attached = yield* fabric.attached();
			const sessions = yield* db.AgentSession.where(rootSessionsOf(agentId)).all();
			for (const session of sessions) {
				const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(session.id, session.status));
				const executionStatus = yield* Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus));
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
			const agent = yield* db.Agent.where({ id: agentId }).first();
			if (Option.isNone(agent)) {
				return yield* new AgentNotFound({ agentId });
			}
			const status = yield* Effect.fromResult(decodeStoredAgentStatus(agent.value.id, agent.value.status));
			const execution = yield* IntentExecution;
			if (status !== "retired") {
				yield* refuseWorking(agentId);
				const next = yield* Effect.fromResult(agentTransition(status, "retire"));
				yield* execution.step("close-records", closeAgent(agentId, status, next));
			}
			yield* execution.step("stop-sessions", stopSessions(agentId));
			yield* execution.step("close-sessions", closeSessions(agentId));
			yield* execution.step("publish-fleet", feeds.publishFleetRefresh());
		});
	return defineIntent({
		execute: (payload) => retireAgent(payload.agentId).pipe(Effect.tap(() => resources.request())),
		payload: RetirePayload,
		reclaim: "requeue",
		tag: "agent/retire",
	});
});
