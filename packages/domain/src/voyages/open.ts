import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import type { VoyageRow } from "#voyage-rows.ts";
import type { OpenVoyageInput } from "#voyages/input.ts";

export const openVoyage = Effect.fn("Voyages.open")(function* (input: OpenVoyageInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const row: VoyageRow = {
		captainBackend: input.backend,
		context: input.context,
		crewBackend: input.backend,
		focusedAt: input.focused === true ? new Date(now) : null,
		id: crypto.randomUUID(),
		kind: "voyage",
		name: input.name,
		northStar: input.northStar,
	};
	yield* db.Voyage.create(row);
	yield* feeds.publishVoyageRefresh();
	return row;
});
