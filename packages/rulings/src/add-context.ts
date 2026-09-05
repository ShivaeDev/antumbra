import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import type { RulingContextInput } from "#acts.ts";
import { requireOpen } from "#open-row.ts";
import { loadRuling } from "#read.ts";

export const addContext = Effect.fn("Rulings.addContext")(function* (input: RulingContextInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const row = yield* requireOpen(input.rulingId);
	yield* db.RulingContext.create({
		at: new Date(now),
		authorAgentId: input.authorAgentId ?? null,
		body: input.body,
		id: crypto.randomUUID(),
		rulingId: row.id,
	});
	const extended = yield* loadRuling(row);
	yield* feeds.publishRulingRefresh();
	return extended;
});
