import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { AgentBackendTag } from "@antumbra/vocabulary/agent-backend";
import { Effect } from "effect";
import { verifyExists } from "#verify-exists.ts";

export const setCrewBackend = Effect.fn("Voyages.setCrewBackend")(function* (voyageId: string, backend: AgentBackendTag) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	yield* verifyExists(voyageId);
	yield* db.Voyage.where({ id: voyageId }).update({ crewBackend: backend });
	yield* feeds.publishVoyageRefresh();
});
