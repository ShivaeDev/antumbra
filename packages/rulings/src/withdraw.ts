import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import { loadRuling, requireRuling } from "#read.ts";
import type { RulingWithdrawInput } from "#retirement.ts";
import { requireStanding } from "#standing-row.ts";

const writeWithdrawal = (input: RulingWithdrawInput, at: Date) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const withdrawn = yield* requireStanding(input.rulingId);
		yield* db.Ruling.where({ id: withdrawn.id }).update({
			withdrawnAt: at,
			withdrawnBy: input.by,
			withdrawnNote: input.note,
		});
		return yield* loadRuling(yield* requireRuling(withdrawn.id));
	});

// why: an authority retires a standing ruling that no later ruling replaces —
// the question stopped mattering rather than getting a different answer. The
// record is appended to and never edited, so the ruling stays reachable by id
// with the note that says why it no longer binds anyone.
export const withdraw = Effect.fn("rulings.withdraw")(function* (input: RulingWithdrawInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const withdrawn = yield* db.transaction(writeWithdrawal(input, new Date(now)));
	yield* feeds.publishRulingRefresh();
	return withdrawn;
});
