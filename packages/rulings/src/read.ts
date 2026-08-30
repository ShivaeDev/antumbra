import { Database } from "@antumbra/persistence";
import { decodeStoredRulingRadius, decodeStoredRulingUrgency } from "@antumbra/vocabulary/ruling";
import { Effect, Option } from "effect";
import { effectiveAxes } from "#axes.ts";
import { RulingNotFound } from "#errors.ts";
import type { Ruling, RulingAxes, RulingChoice } from "#model.ts";
import { storedRequester } from "#requester.ts";
import { storedAnswer, storedReclassification, storedRung } from "#stored.ts";
import { storedSupersession, storedWithdrawal } from "#stored-retirement.ts";
import type { StoredRuling } from "#stored-rows.ts";
import { storedSubject } from "#stored-subjects.ts";

const choicesOf = (rulingId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.RulingChoice.where({ rulingId })
			.orderBy((choice) => choice.position.asc())
			.all();
		return rows.map(
			(row): RulingChoice => ({
				detail: row.detail,
				id: row.id,
				label: row.label,
				position: row.position,
			}),
		);
	});

const gatedPieceIdsOf = (rulingId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.RulingGate.where({ rulingId }).select("pieceId").all();
		return rows.map((row) => row.pieceId);
	});

const reclassificationsOf = (rulingId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		// why: `at` is a millisecond and two words about one ruling can share it,
		// so the id settles the tie — the fold that reads the latest word on each
		// axis must not depend on what order rows came back in.
		const rows = yield* db.RulingReclassification.where({ rulingId })
			.orderBy([(row) => row.at.asc(), (row) => row.id.asc()])
			.all();
		return yield* Effect.forEach(rows, (row) => storedReclassification(rulingId, row));
	});

const declaredOf = (row: StoredRuling) =>
	Effect.gen(function* () {
		return {
			radius: yield* Effect.fromResult(decodeStoredRulingRadius(row.id, row.radius)),
			urgency: yield* Effect.fromResult(decodeStoredRulingUrgency(row.id, row.urgency)),
		} satisfies RulingAxes;
	});

const subjectsOf = (rulingId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.RulingSubject.where({ rulingId }).all();
		return yield* Effect.forEach(rows, (row) => storedSubject(rulingId, row));
	});

export const loadRuling = (row: StoredRuling) =>
	Effect.gen(function* () {
		const declared = yield* declaredOf(row);
		const reclassifications = yield* reclassificationsOf(row.id);
		return {
			answer: yield* storedAnswer(row),
			choices: yield* choicesOf(row.id),
			context: row.context,
			createdAt: row.createdAt,
			declared,
			gatedPieceIds: yield* gatedPieceIdsOf(row.id),
			id: row.id,
			question: row.question,
			reclassifications,
			requester: yield* storedRequester(row),
			rung: yield* storedRung(row),
			subjects: yield* subjectsOf(row.id),
			supersession: yield* storedSupersession(row),
			withdrawal: yield* storedWithdrawal(row),
			...effectiveAxes(declared, reclassifications),
		} satisfies Ruling;
	});

export const requireRuling = (rulingId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const found = yield* db.Ruling.where({ id: rulingId }).first();
		return Option.isNone(found) ? yield* new RulingNotFound({ rulingId }) : found.value;
	});
