import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { decodeStoredBerthStatus, decodeStoredMoorageStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeMarkMoorageReady = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const ensureUnclaimed = (agentId: string) => ensureAgentCanOwnLocalWork(agentId).pipe(Effect.provideService(Database, db));
	const readyRows = (payload: SpawnFields) =>
		db.Berth.where({ agentId: payload.agentId })
			.update({ status: "ready" })
			.pipe(
				Effect.andThen(
					db.Moorage.where({ agentId: payload.agentId }).update({
						status: "ready",
					}),
				),
			);
	return (payload: SpawnFields) =>
		Effect.gen(function* () {
			const moorage = yield* db.Moorage.where({
				agentId: payload.agentId,
			}).first();
			if (Option.isSome(moorage)) {
				yield* Effect.fromResult(decodeStoredMoorageStatus(moorage.value.agentId, moorage.value.status));
			}
			const berths = yield* db.Berth.where({ agentId: payload.agentId }).all();
			yield* Effect.forEach(berths, (berth) => Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)));
			yield* ensureUnclaimed(payload.agentId).pipe(Effect.andThen(readyRows(payload)));
			yield* feeds.publishFleetRefresh();
		});
});
