import { Database } from "@antumbra/persistence";
import {
	decodeStoredRulingRadius,
	decodeStoredRulingUrgency,
} from "@antumbra/vocabulary/ruling";
import { Effect, Option } from "effect";
import { RulingNotFound } from "#errors.ts";
import type { Ruling, RulingChoice, StoredRuling } from "#model.ts";
import { storedAnswer, storedSubject } from "#stored.ts";

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

const subjectsOf = (rulingId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.RulingSubject.where({ rulingId }).all();
		return yield* Effect.forEach(rows, (row) => storedSubject(rulingId, row));
	});

export const loadRuling = (row: StoredRuling) =>
	Effect.gen(function* () {
		return {
			answer: yield* storedAnswer(row),
			choices: yield* choicesOf(row.id),
			context: row.context,
			createdAt: row.createdAt,
			id: row.id,
			question: row.question,
			radius: yield* Effect.fromResult(
				decodeStoredRulingRadius(row.id, row.radius),
			),
			requesterAgentId: row.requesterAgentId,
			subjects: yield* subjectsOf(row.id),
			urgency: yield* Effect.fromResult(
				decodeStoredRulingUrgency(row.id, row.urgency),
			),
		} satisfies Ruling;
	});

export const requireRuling = (rulingId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const found = yield* db.Ruling.where({ id: rulingId }).first();
		return Option.isNone(found)
			? yield* new RulingNotFound({ rulingId })
			: found.value;
	});
