import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import {
	decodeStoredBerthStatus,
	decodeStoredMoorageStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, PubSub } from "effect";
import { ensureAgentResourcesUnclaimed } from "#resource-reclaim-guard.ts";
import type { SpawnFields } from "#spawn.ts";

export const makeMarkMoorageReady = Effect.gen(function* () {
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
	const readyRows = (payload: SpawnFields) =>
		db.Moorage.where({ agentId: payload.agentId })
			.update({ status: "ready" })
			.pipe(
				Effect.andThen(
					db.Berth.where({ agentId: payload.agentId }).update({
						status: "ready",
					}),
				),
			);
	return (payload: SpawnFields) =>
		Effect.gen(function* () {
			const moorage = yield* provide(
				db.Moorage.where({ agentId: payload.agentId }).first(),
			);
			if (Option.isSome(moorage)) {
				yield* Effect.fromResult(
					decodeStoredMoorageStatus(
						moorage.value.agentId,
						moorage.value.status,
					),
				);
			}
			const berths = yield* provide(
				db.Berth.where({ agentId: payload.agentId }).all(),
			);
			yield* Effect.forEach(berths, (berth) =>
				Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)),
			);
			yield* provide(
				writer.write(
					ensureUnclaimed(payload.agentId).pipe(
						Effect.andThen(readyRows(payload)),
					),
				),
			);
			yield* PubSub.publish(feeds.fleet, undefined);
		});
});
