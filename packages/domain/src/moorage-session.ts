import { decodeStoredAgentSessionStatus } from "@antumbra/agent-runtime-vocabulary";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { MooragePlan } from "@antumbra/plugin-api";
import { Effect, Option, PubSub } from "effect";
import type { SpawnFields } from "#spawn.ts";

export const makeEnsureSessionRow = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const feeds = yield* DomainFeeds;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	return (payload: SpawnFields, plan: MooragePlan) =>
		Effect.gen(function* () {
			const session = yield* provide(
				db.AgentSession.where({ id: payload.sessionId }).first(),
			);
			if (Option.isSome(session)) {
				yield* Effect.fromResult(
					decodeStoredAgentSessionStatus(
						session.value.id,
						session.value.status,
					),
				);
				return;
			}
			yield* provide(
				writer.write(
					db.AgentSession.create({
						agentId: payload.agentId,
						backend: payload.backend,
						charterDeliveredAt: null,
						cwd: plan.root,
						id: payload.sessionId,
						nativeRef: null,
						executionStatus: "active",
						status: "open",
					}),
				),
			);
			yield* PubSub.publish(feeds.fleet, undefined);
		});
});
