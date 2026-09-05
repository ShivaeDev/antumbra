import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { AgentBackendTag } from "@antumbra/vocabulary/agent-backend";
import { Effect } from "effect";
import { requireVoyage } from "#voyage-record.ts";

export const setCrewBackend = Effect.fn("Voyages.setCrewBackend")(function* (voyageId: string, backend: AgentBackendTag) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	yield* requireVoyage(voyageId);
	yield* db.Voyage.where({ id: voyageId }).update({ crewBackend: backend });
	yield* feeds.publishVoyageRefresh();
});
