import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import type { RulingReclassifyInput } from "#acts.ts";
import { RulingReclassificationEmpty } from "#errors.ts";
import { requireOpen } from "#open-row.ts";
import { loadRuling } from "#read.ts";

export const reclassify = Effect.fn("Rulings.reclassify")(function* (input: RulingReclassifyInput) {
	if (input.radius === undefined && input.urgency === undefined) {
		return yield* new RulingReclassificationEmpty({ rulingId: input.rulingId });
	}
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const row = yield* requireOpen(input.rulingId);
	yield* db.RulingReclassification.create({
		at: new Date(now),
		by: input.by,
		byAgentId: input.byAgentId ?? null,
		id: crypto.randomUUID(),
		note: input.note ?? null,
		radius: input.radius ?? null,
		rulingId: input.rulingId,
		urgency: input.urgency ?? null,
	});
	const reclassified = yield* loadRuling(row);
	yield* feeds.publishRulingRefresh();
	return reclassified;
});
