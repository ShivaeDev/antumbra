import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import type { RulingRequest } from "#acts.ts";
import { appendGate, requirePiece } from "#gate-rows.ts";
import { loadRuling, requireRuling } from "#read.ts";
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
		yield* db.Ruling.create(row);
		yield* Effect.forEach(offered.rows, (choice) => db.RulingChoice.create(choice));
		if (offered.recommendedChoiceId !== null) {
			yield* db.Ruling.where({ id: row.id }).update({ recommendedChoiceId: offered.recommendedChoiceId });
		}
		yield* Effect.forEach(input.subjects, (subject) => db.RulingSubject.create(subjectRow(row.id, subject)));
		yield* Effect.forEach(input.gates, (pieceId) => appendGate(row.id, pieceId));
		return yield* loadRuling(yield* requireRuling(row.id));
	});

export const request = Effect.fn("rulings.request")(function* (input: RulingRequest) {
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const stored = yield* writeRequest(requested(input, now), input);
	yield* feeds.publishRulingRefresh();
	if (stored.gatedPieceIds.length > 0) {
		yield* feeds.publishVoyageRefresh();
	}
	return stored;
});
