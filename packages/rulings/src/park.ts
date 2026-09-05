import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import type { RulingParkInput } from "#acts.ts";
import { RulingAlreadyParked } from "#errors.ts";
import { requireOpen } from "#open-row.ts";
import { loadRuling, requireRuling } from "#read.ts";

export const park = Effect.fn("Rulings.park")(function* (input: RulingParkInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const row = yield* requireOpen(input.rulingId);
	if (row.parkedAt !== null) {
		return yield* new RulingAlreadyParked({ rulingId: input.rulingId });
	}
	yield* db.Ruling.where({ id: row.id }).update({ parkedAt: new Date(now), parkedNote: input.note });
	const parked = yield* loadRuling(yield* requireRuling(row.id));
	yield* feeds.publishRulingRefresh();
	return parked;
});
