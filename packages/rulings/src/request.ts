import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import type { RulingRequest, StoredRuling } from "#model.ts";
import { loadRuling } from "#read.ts";
import { subjectRow, verifySubject } from "#subjects.ts";

const choiceRows = (rulingId: string, input: RulingRequest) =>
	input.choices.map((choice, position) => ({
		detail: choice.detail ?? null,
		id: crypto.randomUUID(),
		label: choice.label,
		position,
		rulingId,
	}));

const requested = (input: RulingRequest, nowMillis: number): StoredRuling => ({
	answer: null,
	answerChoiceId: null,
	context: input.context,
	createdAt: new Date(nowMillis),
	id: crypto.randomUUID(),
	question: input.question,
	radius: input.radius,
	requesterAgentId: input.requesterAgentId,
	ruledAt: null,
	ruledBy: null,
	supersededAt: null,
	supersededBy: null,
	supersededById: null,
	urgency: input.urgency,
});

const writeRequest = (row: StoredRuling, input: RulingRequest) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* Effect.forEach(input.subjects, verifySubject);
		yield* db.Ruling.create(row);
		yield* Effect.forEach(choiceRows(row.id, input), (choice) =>
			db.RulingChoice.create(choice),
		);
		yield* Effect.forEach(input.subjects, (subject) =>
			db.RulingSubject.create(subjectRow(row.id, subject)),
		);
		return yield* loadRuling(row);
	});

// why: the whole request is one write. A subject naming nothing refuses it
// before any row lands, so a ruling never carries a reference the fleet lost.
export const request = Effect.fn("rulings.request")(function* (
	input: RulingRequest,
) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const stored = yield* db.transaction(
		writeRequest(requested(input, now), input),
	);
	yield* feeds.publishRulingRefresh();
	return stored;
});
