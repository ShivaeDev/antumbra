import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import { loadRuling, requireRuling } from "#read.ts";
import type { RulingWithdrawInput } from "#retirement.ts";
import { requireStanding } from "#standing-row.ts";

export const withdraw = Effect.fn("rulings.withdraw")(function* (input: RulingWithdrawInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const row = yield* requireStanding(input.rulingId);
	yield* db.Ruling.where({ id: row.id }).update({
		withdrawnAt: new Date(now),
		withdrawnBy: input.by,
		withdrawnNote: input.note,
	});
	const withdrawn = yield* loadRuling(yield* requireRuling(row.id));
	yield* feeds.publishRulingRefresh();
	return withdrawn;
});
