import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import { RulingSupersedesItself } from "#errors.ts";
import { loadRuling, requireRuling } from "#read.ts";
import type { RulingSupersedeInput } from "#retirement.ts";
import { requireStanding } from "#standing-row.ts";
import type { StoredRuling } from "#stored-rows.ts";

const writeSupersession = (input: RulingSupersedeInput, at: Date) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (input.rulingId === input.byRulingId) {
			return yield* new RulingSupersedesItself({ rulingId: input.rulingId });
		}
		const superseded: StoredRuling = yield* requireStanding(input.rulingId);
		yield* requireStanding(input.byRulingId);
		yield* db.Ruling.where({ id: superseded.id }).update({
			supersededAt: at,
			supersededBy: input.by,
			supersededById: input.byRulingId,
		});
		return yield* loadRuling(yield* requireRuling(superseded.id));
	});

// why: superseding appends provenance to the old ruling and edits nothing
// else, so both rulings stay readable and only the standing set changes. Both
// must stand: an open question binds nothing yet, and a ruling already
// superseded has had its say taken over once.
export const supersede = Effect.fn("rulings.supersede")(function* (input: RulingSupersedeInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const superseded = yield* db.transaction(writeSupersession(input, new Date(now)));
	yield* feeds.publishRulingRefresh();
	return superseded;
});
