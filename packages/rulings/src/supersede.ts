import { DomainFeeds } from "@antumbra/domain-feeds";
import { Clock, Effect } from "effect";
import { RulingSupersedesItself } from "#errors.ts";
import { loadRuling, requireRuling } from "#read.ts";
import type { RulingSupersedeInput } from "#retirement.ts";
import { requireStanding } from "#standing-row.ts";
import type { StoredRuling } from "#stored-rows.ts";
import { markSuperseded } from "#supersession-row.ts";

export const supersede = Effect.fn("rulings.supersede")(function* (input: RulingSupersedeInput) {
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	if (input.rulingId === input.byRulingId) {
		return yield* new RulingSupersedesItself({ rulingId: input.rulingId });
	}
	const row: StoredRuling = yield* requireStanding(input.rulingId);
	yield* requireStanding(input.byRulingId);
	yield* markSuperseded(row.id, input, new Date(now));
	const superseded = yield* loadRuling(yield* requireRuling(row.id));
	yield* feeds.publishRulingRefresh();
	return superseded;
});
