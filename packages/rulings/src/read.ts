import { Database } from "@antumbra/persistence";
import { decodeStoredRulingRadius, decodeStoredRulingUrgency } from "@antumbra/vocabulary/ruling";
import { Effect, Option } from "effect";
import { effectiveAxes } from "#axes.ts";
import { RulingNotFound } from "#errors.ts";
import type { Ruling, RulingAxes } from "#model.ts";
import { storedRequester } from "#requester.ts";
import { storedAnswer, storedReclassification, storedRecommendation, storedRung } from "#stored.ts";
import { storedContext } from "#stored-contexts.ts";
import { storedParking } from "#stored-parking.ts";
import { storedSupersession, storedWithdrawal } from "#stored-retirement.ts";
import type { StoredRuling } from "#stored-rows.ts";
import { storedSubject } from "#stored-subjects.ts";

const relationsOf = Effect.fnUntraced(function* (rulingId: string) {
	const db = yield* Database;
	return {
		choices: yield* db.RulingChoice.where({ rulingId })
			.orderBy((choice) => choice.position.asc())
			.all(),
		contexts: yield* db.RulingContext.where({ rulingId })
			.orderBy((row) => row.at.asc())
			.all(),
		gates: yield* db.RulingGate.where({ rulingId }).all(),
		reclassifications: yield* db.RulingReclassification.where({ rulingId })
			.orderBy((row) => row.at.asc())
			.all(),
		subjects: yield* db.RulingSubject.where({ rulingId }).all(),
	};
});

const declaredOf = Effect.fnUntraced(function* (row: StoredRuling) {
	return {
		radius: yield* Effect.fromResult(decodeStoredRulingRadius(row.id, row.radius)),
		urgency: yield* Effect.fromResult(decodeStoredRulingUrgency(row.id, row.urgency)),
	} satisfies RulingAxes;
});

export const decodeRuling = Effect.fnUntraced(function* (row: StoredRuling & Effect.Success<ReturnType<typeof relationsOf>>) {
	const declared = yield* declaredOf(row);
	const reclassifications = yield* Effect.forEach(row.reclassifications, (entry) => storedReclassification(row.id, entry));
	return {
		answer: yield* storedAnswer(row),
		choices: row.choices,
		context: row.context,
		contexts: row.contexts.map(storedContext),
		createdAt: row.createdAt,
		declared,
		gatedPieceIds: row.gates.map((gate) => gate.pieceId),
		id: row.id,
		parked: yield* storedParking(row),
		question: row.question,
		reclassifications,
		recommendation: yield* storedRecommendation(row),
		requester: yield* storedRequester(row),
		rung: yield* storedRung(row),
		subjects: yield* Effect.forEach(row.subjects, (subject) => storedSubject(row.id, subject)),
		supersession: yield* storedSupersession(row),
		withdrawal: yield* storedWithdrawal(row),
		...effectiveAxes(declared, reclassifications),
	} satisfies Ruling;
});

export const loadRuling = Effect.fnUntraced(function* (row: StoredRuling) {
	return yield* decodeRuling({ ...row, ...(yield* relationsOf(row.id)) });
});

export const requireRuling = Effect.fnUntraced(function* (rulingId: string) {
	const db = yield* Database;
	const found = yield* db.Ruling.where({ id: rulingId }).first();
	return Option.isNone(found) ? yield* new RulingNotFound({ rulingId }) : found.value;
});
