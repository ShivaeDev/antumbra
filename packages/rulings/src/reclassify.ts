import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import type { RulingReclassifyInput } from "#acts.ts";
import { RulingAlreadyRuled, RulingReclassificationEmpty } from "#errors.ts";
import { loadRuling, requireRuling } from "#read.ts";

export const reclassify = Effect.fn("rulings.reclassify")(function* (input: RulingReclassifyInput) {
	if (input.radius === undefined && input.urgency === undefined) {
		return yield* new RulingReclassificationEmpty({ rulingId: input.rulingId });
	}
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const row = yield* requireRuling(input.rulingId);
	if (row.ruledAt !== null) {
		return yield* new RulingAlreadyRuled({ rulingId: input.rulingId });
	}
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
