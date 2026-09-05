import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineIntent, IntentExecution } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { SessionRetirement } from "@antumbra/sessions/retirement/service";
import { type AgentStatus, agentTransition, decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, Schema } from "effect";
import { AgentNotFound } from "#errors.ts";

const RetirePayload = Schema.Struct({ agentId: Schema.String });
export type RetireFields = typeof RetirePayload.Type;

export const makeRetireKind = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const sessions = yield* SessionRetirement;
	const resources = yield* ResourceReconciler;
	const closeAgent = (agentId: string, current: AgentStatus, next: AgentStatus) =>
		db.Agent.where({ id: agentId, status: current }).update({
			currentSessionId: null,
			status: next,
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
				yield* sessions.ensureRetirable(agentId);
				const next = yield* Effect.fromResult(agentTransition(status, "retire"));
				yield* execution.step("close-records", closeAgent(agentId, status, next));
			}
			yield* execution.step("stop-sessions", sessions.stopRoots(agentId));
			yield* execution.step("close-sessions", sessions.closeOpen(agentId));
			yield* execution.step("publish-fleet", feeds.publishFleetRefresh());
		});
	return defineIntent({
		execute: (payload) => retireAgent(payload.agentId).pipe(Effect.tap(() => resources.request())),
		payload: RetirePayload,
		reclaim: "requeue",
		tag: "agent/retire",
	});
});
