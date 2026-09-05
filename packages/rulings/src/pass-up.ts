import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import type { RulingPassUpInput } from "#acts.ts";
import { rungAbove } from "#authority.ts";
import { RulingNotAtRung } from "#errors.ts";
import { requireOpen } from "#open-row.ts";
import { loadRuling, requireRuling } from "#read.ts";
import { storedRung } from "#stored.ts";

export const passUp = Effect.fn("rulings.passUp")(function* (input: RulingPassUpInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const row = yield* requireOpen(input.rulingId);
	const rung = yield* storedRung(row);
	if (!Option.contains(rung, input.by)) {
		return yield* new RulingNotAtRung({
			by: input.by,
			rulingId: input.rulingId,
			rung: Option.getOrNull(rung),
		});
	}
	yield* db.RulingReclassification.create({
		at: new Date(now),
		by: input.by,
		byAgentId: input.byAgentId ?? null,
		id: crypto.randomUUID(),
		note: input.note,
		radius: null,
		rulingId: input.rulingId,
		urgency: null,
	});
	yield* db.Ruling.where({ id: input.rulingId }).update({ rung: rungAbove[input.by] });
	const climbed = yield* loadRuling(yield* requireRuling(input.rulingId));
	yield* feeds.publishRulingRefresh();
	return climbed;
});
