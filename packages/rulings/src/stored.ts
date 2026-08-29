import {
	decodeStoredRulingAuthority,
	decodeStoredRulingRadius,
	decodeStoredRulingSubjectKind,
	decodeStoredRulingUrgency,
	StoredRulingValueInvalid,
} from "@antumbra/vocabulary/ruling";
import { Effect, Option, type Result } from "effect";
import type {
	RulingAnswer,
	RulingReclassification,
	RulingReferenceKind,
	RulingSubject,
	RulingSupersession,
} from "#model.ts";
import type {
	StoredRuling,
	StoredRulingReclassification,
	StoredRulingSubject,
} from "#stored-rows.ts";

const REFERENCE_COLUMN: Readonly<
	Record<RulingReferenceKind, (row: StoredRulingSubject) => string | null>
> = {
	agent: (row) => row.agentId,
	piece: (row) => row.pieceId,
	repo: (row) => row.repoId,
	voyage: (row) => row.voyageId,
};

const invalid = (field: string, rulingId: string, value: unknown) =>
	new StoredRulingValueInvalid({ field, rulingId, value });

const reference = (
	rulingId: string,
	kind: RulingReferenceKind,
	row: StoredRulingSubject,
) => {
	const id = REFERENCE_COLUMN[kind](row);
	return id === null
		? Effect.fail(invalid("subject reference", rulingId, row))
		: Effect.succeed<RulingSubject>({ id, kind });
};

export const storedSubject = (rulingId: string, row: StoredRulingSubject) =>
	Effect.gen(function* () {
		const kind = yield* Effect.fromResult(
			decodeStoredRulingSubjectKind(rulingId, row.kind),
		);
		if (kind !== "tag") {
			return yield* reference(rulingId, kind, row);
		}
		return row.tag === null
			? yield* invalid("subject tag", rulingId, row)
			: ({ kind, tag: row.tag } satisfies RulingSubject);
	});

// why: a ruling is unruled or fully ruled; a row holding only part of an answer
// is corruption rather than a half-answered question the readers must model.
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
			choiceId: Option.fromNullOr(row.answerChoiceId),
			text: row.answer,
		});
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
			note: Option.fromNullOr(row.note),
			radius: yield* storedAxis(decodeStoredRulingRadius, rulingId, row.radius),
			urgency: yield* storedAxis(
				decodeStoredRulingUrgency,
				rulingId,
				row.urgency,
			),
		} satisfies RulingReclassification;
	});
