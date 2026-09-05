import { decodeStoredRulingSubjectKind } from "@antumbra/vocabulary/ruling";
import { Effect } from "effect";
import type { RulingReferenceKind, RulingSubject } from "#model.ts";
import { invalidRulingValue } from "#stored.ts";
import type { StoredRulingSubject } from "#stored-rows.ts";

const REFERENCE_COLUMN: Readonly<Record<RulingReferenceKind, (row: StoredRulingSubject) => string | null>> = {
	agent: (row) => row.agentId,
	piece: (row) => row.pieceId,
	repo: (row) => row.repoId,
	voyage: (row) => row.voyageId,
};

const reference = (rulingId: string, kind: RulingReferenceKind, row: StoredRulingSubject) => {
	const id = REFERENCE_COLUMN[kind](row);
	return id === null ? Effect.fail(invalidRulingValue("subject reference", rulingId, row)) : Effect.succeed<RulingSubject>({ id, kind });
};

export const storedSubject = Effect.fnUntraced(function* (rulingId: string, row: StoredRulingSubject) {
	const kind = yield* Effect.fromResult(decodeStoredRulingSubjectKind(rulingId, row.kind));
	if (kind !== "tag") {
		return yield* reference(rulingId, kind, row);
	}
	return row.tag === null ? yield* invalidRulingValue("subject tag", rulingId, row) : ({ kind, tag: row.tag } satisfies RulingSubject);
});
