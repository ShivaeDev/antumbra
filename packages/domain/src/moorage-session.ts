import { decodeStoredAgentSessionStatus } from "@antumbra/agent-runtime-vocabulary";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { MooragePlan } from "@antumbra/plugin-api";
import { Effect, Option, PubSub } from "effect";
import { ensureAgentResourcesUnclaimed } from "#resource-reclaim-guard.ts";
import type { SpawnFields } from "#spawn.ts";

const ensureStoredSessionStatus = (id: string, status: string) =>
	Effect.fromResult(decodeStoredAgentSessionStatus(id, status));

export const makeEnsureSessionRow = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const feeds = yield* DomainFeeds;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const ensureUnclaimed = (agentId: string) =>
		ensureAgentResourcesUnclaimed(agentId).pipe(
			Effect.provideService(Database, db),
		);
	const ensureSession = (payload: SpawnFields, plan: MooragePlan) =>
		Effect.gen(function* () {
			const session = yield* db.AgentSession.where({
				id: payload.sessionId,
			}).first();
			if (Option.isSome(session)) {
				yield* ensureStoredSessionStatus(
					session.value.id,
					session.value.status,
				);
				return false;
			}
			yield* db.AgentSession.create({
				agentId: payload.agentId,
				backend: payload.backend,
				charterDeliveredAt: null,
				cwd: plan.root,
				id: payload.sessionId,
				nativeRef: null,
				executionStatus: "active",
				status: "open",
			});
			return true;
		});
	return (payload: SpawnFields, plan: MooragePlan) =>
		Effect.gen(function* () {
			const created = yield* provide(
				writer.write(
					Effect.gen(function* () {
						yield* ensureUnclaimed(payload.agentId);
						return yield* ensureSession(payload, plan);
					}),
				),
			);
			if (created) {
				yield* PubSub.publish(feeds.fleet, undefined);
			}
		});
});
