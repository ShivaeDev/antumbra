import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";

export const assignAgent = Effect.fn("Voyages.assignAgent")(function* (voyageId: string, agentId: string, role: string) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const existing = yield* db.VoyageAgent.where({ agentId, voyageId }).first();
	if (Option.isSome(existing)) {
		return;
	}
	yield* db.VoyageAgent.create({ agentId, voyageId, role });
	yield* feeds.publishVoyageRefresh();
});
