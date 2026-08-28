import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import { RulingAlreadyRuled, RulingChoiceUnknown } from "#errors.ts";
import type { RulingVerdict } from "#model.ts";
import { loadRuling, requireRuling } from "#read.ts";

const offeredChoice = (input: RulingVerdict) =>
	Effect.gen(function* () {
		const choiceId = input.choiceId;
		if (choiceId === undefined) {
			return null;
		}
		const db = yield* Database;
		const offered = yield* db.RulingChoice.where({
			id: choiceId,
			rulingId: input.rulingId,
		}).exists();
		return offered
			? choiceId
			: yield* new RulingChoiceUnknown({ choiceId, rulingId: input.rulingId });
	});

const writeVerdict = (input: RulingVerdict, at: Date) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* requireRuling(input.rulingId);
		if (row.ruledAt !== null) {
			return yield* new RulingAlreadyRuled({ rulingId: input.rulingId });
		}
		const answerChoiceId = yield* offeredChoice(input);
		yield* db.Ruling.where({ id: input.rulingId }).update({
			answer: input.answer,
			answerChoiceId,
			ruledAt: at,
			ruledBy: input.by,
		});
		return yield* loadRuling(yield* requireRuling(input.rulingId));
	});

// why: free text always stands beside a pick, because the words an authority
// adds are what a later reader needs to know how far the answer reaches.
export const rule = Effect.fn("rulings.rule")(function* (input: RulingVerdict) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const ruled = yield* db.transaction(writeVerdict(input, new Date(now)));
	yield* feeds.publishRulingRefresh();
	return ruled;
});
