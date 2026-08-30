import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import type { RulingVerdict } from "#acts.ts";
import { answersAt, reachesRung } from "#authority.ts";
import { RulingAlreadyRuled, RulingBelowRung, RulingChoiceUnknown, RulingOutsideAuthority } from "#errors.ts";
import type { Ruling } from "#model.ts";
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
		return offered ? choiceId : yield* new RulingChoiceUnknown({ choiceId, rulingId: input.rulingId });
	});

// why: the two refusals answer different questions. The rung says whose turn
// it still is — a question that climbed past a captain is no longer that
// captain's — and reach says how far the answerer may bind, measured against
// the effective radius rather than what the asker declared.
const admits = (open: Ruling, input: RulingVerdict) =>
	Effect.gen(function* () {
		const rung = open.rung;
		if (Option.isSome(rung) && !reachesRung(input.by, rung.value)) {
			return yield* new RulingBelowRung({
				by: input.by,
				rulingId: input.rulingId,
				rung: rung.value,
			});
		}
		if (!answersAt(input.by, open.radius)) {
			return yield* new RulingOutsideAuthority({
				by: input.by,
				radius: open.radius,
				rulingId: input.rulingId,
			});
		}
	});

export const writeVerdict = (input: RulingVerdict, at: Date) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const open = yield* loadRuling(yield* requireRuling(input.rulingId));
		if (Option.isSome(open.answer)) {
			return yield* new RulingAlreadyRuled({ rulingId: input.rulingId });
		}
		yield* admits(open, input);
		const answerChoiceId = yield* offeredChoice(input);
		yield* db.Ruling.where({ id: input.rulingId }).update({
			answer: input.answer,
			answerChoiceId,
			ruledAt: at,
			ruledBy: input.by,
			ruledByAgentId: input.byAgentId ?? null,
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
	// why: an answer releases every piece the ruling held, so readiness has
	// changed for readers that never asked about rulings at all.
	yield* feeds.publishVoyageRefresh();
	return ruled;
});
