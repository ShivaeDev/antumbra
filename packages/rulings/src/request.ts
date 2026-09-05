import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import type { RulingRequest } from "#acts.ts";
import { appendGate, requirePiece } from "#gate-rows.ts";
import { loadRuling } from "#read.ts";
import { offeredChoices } from "#recommendation.ts";
import { requesterColumns } from "#requester.ts";
import type { StoredRuling } from "#stored-rows.ts";
import { subjectRow, verifySubject } from "#subjects.ts";

export const requested = (input: RulingRequest, nowMillis: number): StoredRuling => ({
	answer: null,
	answerChoiceId: null,
	context: input.context,
	createdAt: new Date(nowMillis),
	deliveredAt: null,
	id: crypto.randomUUID(),
	parkedAt: null,
	parkedNote: null,
	question: input.question,
	radius: input.radius,
	recommendationReasoning: input.recommendation?.reasoning ?? null,
	recommendedChoiceId: null,
	...requesterColumns(input.requester),
	ruledAt: null,
	ruledBy: null,
	ruledByAgentId: null,
	rung: input.rung,
	supersededAt: null,
	supersededBy: null,
	supersededById: null,
	urgency: input.urgency,
	withdrawnAt: null,
	withdrawnBy: null,
	withdrawnNote: null,
});

export const writeRequest = (row: StoredRuling, input: RulingRequest) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* Effect.forEach(input.subjects, verifySubject);
		yield* Effect.forEach(input.gates, requirePiece);
		const offered = yield* offeredChoices(row.id, input);
		const asked = { ...row, recommendedChoiceId: offered.recommendedChoiceId };
		yield* db.Ruling.create(asked);
		yield* Effect.forEach(offered.rows, (choice) => db.RulingChoice.create(choice));
		yield* Effect.forEach(input.subjects, (subject) => db.RulingSubject.create(subjectRow(row.id, subject)));
		yield* Effect.forEach(input.gates, (pieceId) => appendGate(row.id, pieceId));
		return yield* loadRuling(asked);
	});

export const request = Effect.fn("Rulings.request")(function* (input: RulingRequest) {
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const stored = yield* writeRequest(requested(input, now), input);
	yield* feeds.publishRulingRefresh();
	if (stored.gatedPieceIds.length > 0) {
		yield* feeds.publishVoyageRefresh();
	}
	return stored;
});
