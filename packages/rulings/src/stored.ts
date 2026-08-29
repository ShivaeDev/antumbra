import {
	decodeStoredRulingAuthority,
	decodeStoredRulingRadius,
	decodeStoredRulingUrgency,
	type RulingAuthority,
	StoredRulingValueInvalid,
} from "@antumbra/vocabulary/ruling";
import { Effect, Option, type Result } from "effect";
import type {
	RulingAnswer,
	RulingReclassification,
	RulingSupersession,
} from "#model.ts";
import type {
	StoredRuling,
	StoredRulingReclassification,
} from "#stored-rows.ts";

const invalid = (field: string, rulingId: string, value: unknown) =>
	new StoredRulingValueInvalid({ field, rulingId, value });

// why: a ruling is unruled or fully ruled; a row holding only part of an answer
// is corruption rather than a half-answered question the readers must model.
// The agent beside the rung is optional: the admiral rules from the window and
// is no agent the fleet has a row for.
export const storedAnswer = (row: StoredRuling) =>
	Effect.gen(function* () {
		const parts = [row.answer, row.ruledAt, row.ruledBy].filter(
			(part) => part !== null,
		);
		if (parts.length === 0) {
			return Option.none<RulingAnswer>();
		}
		if (row.answer === null || row.ruledAt === null || row.ruledBy === null) {
			return yield* invalid("answer", row.id, row);
		}
		return Option.some<RulingAnswer>({
			at: row.ruledAt,
			by: yield* Effect.fromResult(
				decodeStoredRulingAuthority(row.id, row.ruledBy),
			),
			byAgentId: Option.fromNullOr(row.ruledByAgentId),
			choiceId: Option.fromNullOr(row.answerChoiceId),
			text: row.answer,
		});
	});

// why: an agent's question is always owed to one rung and a rule an authority
// wrote for itself is owed to nobody, so a row carrying the wrong one of the
// two is corruption rather than a third kind of question the readers must model.
export const storedRung = (row: StoredRuling) =>
	Effect.gen(function* () {
		const asked = row.requesterAgentId !== null;
		if (row.rung === null) {
			return asked
				? yield* invalid("rung", row.id, row)
				: Option.none<RulingAuthority>();
		}
		if (!asked) {
			return yield* invalid("rung", row.id, row);
		}
		return Option.some(
			yield* Effect.fromResult(decodeStoredRulingAuthority(row.id, row.rung)),
		);
	});

// why: supersession is one appended fact with its provenance; a row naming
// the ruling that took over without who did it or when is corruption.
export const storedSupersession = (row: StoredRuling) =>
	Effect.gen(function* () {
		const parts = [row.supersededAt, row.supersededBy, row.supersededById];
		if (parts.every((part) => part === null)) {
			return Option.none<RulingSupersession>();
		}
		if (
			row.supersededAt === null ||
			row.supersededBy === null ||
			row.supersededById === null
		) {
			return yield* invalid("supersession", row.id, row);
		}
		return Option.some<RulingSupersession>({
			at: row.supersededAt,
			by: yield* Effect.fromResult(
				decodeStoredRulingAuthority(row.id, row.supersededBy),
			),
			byRulingId: row.supersededById,
		});
	});

const storedAxis = <Value>(
	decode: (
		rulingId: string,
		value: string,
	) => Result.Result<Value, StoredRulingValueInvalid>,
	rulingId: string,
	value: string | null,
) =>
	value === null
		? Effect.succeed(Option.none<Value>())
		: Effect.map(Effect.fromResult(decode(rulingId, value)), Option.some);

export const storedReclassification = (
	rulingId: string,
	row: StoredRulingReclassification,
) =>
	Effect.gen(function* () {
		return {
			at: row.at,
			by: yield* Effect.fromResult(
				decodeStoredRulingAuthority(rulingId, row.by),
			),
			byAgentId: Option.fromNullOr(row.byAgentId),
			note: Option.fromNullOr(row.note),
			radius: yield* storedAxis(decodeStoredRulingRadius, rulingId, row.radius),
			urgency: yield* storedAxis(
				decodeStoredRulingUrgency,
				rulingId,
				row.urgency,
			),
		} satisfies RulingReclassification;
	});
