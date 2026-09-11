import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { decodeStoredBerthStatus, decodeStoredMoorageStatus } from "@antumbra/platform-vocabulary/agent-runtime/stored.ts";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { Effect, Option } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";

export const markMoorageReady = Effect.fn("AgentBirth.markMoorageReady")(function* (payload: SpawnFields) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const moorage = yield* db.Moorage.where({ agentId: payload.agentId }).first();
	if (Option.isSome(moorage)) {
		yield* Effect.fromResult(decodeStoredMoorageStatus(moorage.value.agentId, moorage.value.status));
	}
	const berths = yield* db.Berth.where({ agentId: payload.agentId }).all();
	yield* Effect.forEach(berths, (berth) => Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)));
	yield* ensureAgentCanOwnLocalWork(payload.agentId);
	yield* db.Berth.where({ agentId: payload.agentId }).update({ status: "ready" });
	yield* db.Moorage.where({ agentId: payload.agentId }).update({ status: "ready" });
	yield* feeds.publishFleetRefresh();
});
