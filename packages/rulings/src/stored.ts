import {
	decodeStoredRulingAuthority,
	decodeStoredRulingRadius,
	decodeStoredRulingUrgency,
	type RulingAuthority,
	StoredRulingValueInvalid,
} from "@antumbra/vocabulary/ruling";
import { Effect, Option, type Result } from "effect";
import type { RulingAnswer, RulingReclassification, RulingRecommendation } from "#model.ts";
import type { StoredRuling, StoredRulingReclassification } from "#stored-rows.ts";

export const invalidRulingValue = (field: string, rulingId: string, value: unknown) => new StoredRulingValueInvalid({ field, rulingId, value });

export const storedAnswer = (row: StoredRuling) =>
	Effect.gen(function* () {
		const parts = [row.answer, row.ruledAt, row.ruledBy].filter((part) => part !== null);
		if (parts.length === 0) {
			return Option.none<RulingAnswer>();
		}
		if (row.answer === null || row.ruledAt === null || row.ruledBy === null) {
			return yield* invalidRulingValue("answer", row.id, row);
		}
		return Option.some<RulingAnswer>({
			at: row.ruledAt,
			by: yield* Effect.fromResult(decodeStoredRulingAuthority(row.id, row.ruledBy)),
			byAgentId: Option.fromNullOr(row.ruledByAgentId),
			choiceId: Option.fromNullOr(row.answerChoiceId),
			text: row.answer,
		});
	});

export const storedRecommendation = (row: StoredRuling) =>
	Effect.gen(function* () {
		if (row.recommendedChoiceId === null && row.recommendationReasoning === null) {
			return Option.none<RulingRecommendation>();
		}
		if (row.recommendedChoiceId === null || row.recommendationReasoning === null) {
			return yield* invalidRulingValue("recommendation", row.id, row);
		}
		return Option.some<RulingRecommendation>({ choiceId: row.recommendedChoiceId, reasoning: row.recommendationReasoning });
	});

export const storedRung = (row: StoredRuling) =>
	Effect.gen(function* () {
		const asked = row.requesterAgentId !== null;
		if (row.rung === null) {
			return asked ? yield* invalidRulingValue("rung", row.id, row) : Option.none<RulingAuthority>();
		}
		if (!asked) {
			return yield* invalidRulingValue("rung", row.id, row);
		}
		return Option.some(yield* Effect.fromResult(decodeStoredRulingAuthority(row.id, row.rung)));
	});

const storedAxis = <Value>(
	decode: (rulingId: string, value: string) => Result.Result<Value, StoredRulingValueInvalid>,
	rulingId: string,
	value: string | null,
) => (value === null ? Effect.succeed(Option.none<Value>()) : Effect.map(Effect.fromResult(decode(rulingId, value)), Option.some));

export const storedReclassification = (rulingId: string, row: StoredRulingReclassification) =>
	Effect.gen(function* () {
		return {
			at: row.at,
			by: yield* Effect.fromResult(decodeStoredRulingAuthority(rulingId, row.by)),
			byAgentId: Option.fromNullOr(row.byAgentId),
			note: Option.fromNullOr(row.note),
			radius: yield* storedAxis(decodeStoredRulingRadius, rulingId, row.radius),
			urgency: yield* storedAxis(decodeStoredRulingUrgency, rulingId, row.urgency),
		} satisfies RulingReclassification;
	});
