import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { MooragePlan } from "@antumbra/plugin-api";
import { ensureAgentResourcesUnclaimed } from "@antumbra/resource-reclamation";
import { decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, PubSub } from "effect";
import { AgentNotFound, AgentSessionConflict } from "#errors.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeEnsureSessionRow = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const feeds = yield* DomainFeeds;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const ensureSession = (payload: SpawnFields, plan: MooragePlan) =>
		Effect.gen(function* () {
			const agent = yield* db.Agent.where({ id: payload.agentId }).first();
			if (Option.isNone(agent)) {
				return yield* new AgentNotFound({ agentId: payload.agentId });
			}
			if (agent.value.currentSessionId !== payload.sessionId) {
				return yield* new AgentSessionConflict({
					agentId: payload.agentId,
					currentSessionId: agent.value.currentSessionId,
					sessionId: payload.sessionId,
				});
			}
			const session = yield* db.AgentSession.where({
				id: payload.sessionId,
			}).first();
			if (Option.isSome(session)) {
				const status = yield* Effect.fromResult(
					decodeStoredAgentSessionStatus(
						session.value.id,
						session.value.status,
					),
				);
				if (session.value.agentId !== payload.agentId || status !== "open") {
					return yield* new AgentSessionConflict({
						agentId: payload.agentId,
						currentSessionId: agent.value.currentSessionId,
						sessionId: payload.sessionId,
					});
				}
				return false;
			}
			// why: a spawn opens a root — no parent, and it roots its own tree.
			// Subsession rows are born by the tree's own creator, never here.
			yield* db.AgentSession.create({
				agentId: payload.agentId,
				backend: payload.backend,
				charterDeliveredAt: null,
				completeness: "recording",
				cwd: plan.root,
				executionStatus: "active",
				id: payload.sessionId,
				kind: null,
				label: null,
				nativeRef: null,
				outcome: null,
				parentSessionId: null,
				rootSessionId: payload.sessionId,
				status: "open",
			});
			return true;
		});
	return (payload: SpawnFields, plan: MooragePlan) =>
		Effect.gen(function* () {
			const created = yield* provide(
				writer.write(
					ensureAgentResourcesUnclaimed(payload.agentId).pipe(
						Effect.provideService(Database, db),
						Effect.andThen(ensureSession(payload, plan)),
					),
				),
			);
			if (created) {
				yield* PubSub.publish(feeds.fleet, undefined);
				yield* PubSub.publish(feeds.voyages, undefined);
			}
		});
});
