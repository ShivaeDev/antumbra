import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import type { RulingReclassifyInput } from "#acts.ts";
import { RulingAlreadyRuled, RulingReclassificationEmpty } from "#errors.ts";
import { loadRuling, requireRuling } from "#read.ts";

const writeReclassification = (input: RulingReclassifyInput, at: Date) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* requireRuling(input.rulingId);
		if (row.ruledAt !== null) {
			return yield* new RulingAlreadyRuled({ rulingId: input.rulingId });
		}
		yield* db.RulingReclassification.create({
			at,
			by: input.by,
			byAgentId: input.byAgentId ?? null,
			id: crypto.randomUUID(),
			note: input.note ?? null,
			radius: input.radius ?? null,
			rulingId: input.rulingId,
			urgency: input.urgency ?? null,
		});
		return yield* loadRuling(row);
	});

// why: a ruled ruling is read in the light of the axes it was ruled under, so
// only an open one may be reclassified, and each reclassification is appended
// beside the asker's declaration rather than written over it.
export const reclassify = Effect.fn("rulings.reclassify")(function* (input: RulingReclassifyInput) {
	if (input.radius === undefined && input.urgency === undefined) {
		return yield* new RulingReclassificationEmpty({ rulingId: input.rulingId });
	}
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const reclassified = yield* db.transaction(writeReclassification(input, new Date(now)));
	yield* feeds.publishRulingRefresh();
	return reclassified;
});
