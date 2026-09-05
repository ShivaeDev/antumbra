import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import { requireVoyage } from "#voyage-record.ts";

export const setFocus = Effect.fn("Voyages.setFocus")(function* (voyageId: string, focused: boolean) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	yield* requireVoyage(voyageId);
	yield* db.Voyage.where({ id: voyageId }).update({
		focusedAt: focused ? new Date(now) : null,
	});
	yield* feeds.publishVoyageRefresh();
});
