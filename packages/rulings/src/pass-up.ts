import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import type { RulingPassUpInput } from "#acts.ts";
import { rungAbove } from "#authority.ts";
import { RulingAlreadyRuled, RulingNotAtRung } from "#errors.ts";
import { loadRuling, requireRuling } from "#read.ts";
import { storedRung } from "#stored.ts";

const writePassUp = (input: RulingPassUpInput, at: Date) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* requireRuling(input.rulingId);
		if (row.ruledAt !== null) {
			return yield* new RulingAlreadyRuled({ rulingId: input.rulingId });
		}
		const rung = yield* storedRung(row);
		if (!Option.contains(rung, input.by)) {
			return yield* new RulingNotAtRung({
				by: input.by,
				rulingId: input.rulingId,
				rung: Option.getOrNull(rung),
			});
		}
		yield* db.RulingReclassification.create({
			at,
			by: input.by,
			byAgentId: input.byAgentId ?? null,
			id: crypto.randomUUID(),
			note: input.note,
			radius: null,
			rulingId: input.rulingId,
			urgency: null,
		});
		yield* db.Ruling.where({ id: input.rulingId }).update({
			rung: rungAbove[input.by],
		});
		return yield* loadRuling(yield* requireRuling(input.rulingId));
	});

// why: a rung that cannot settle a question moves it one step and leaves what
// it knows beside the asker's declaration, so the question climbs richer than
// it arrived and the record says who sent it on. Only the rung the question is
// owed to may move it: one that already climbed past is no longer its to send.
export const passUp = Effect.fn("rulings.passUp")(function* (
	input: RulingPassUpInput,
) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const climbed = yield* db.transaction(writePassUp(input, new Date(now)));
	yield* feeds.publishRulingRefresh();
	return climbed;
});
