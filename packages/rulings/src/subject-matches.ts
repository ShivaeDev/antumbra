import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingSubject } from "#model.ts";

type SubjectKind = RulingSubject["kind"];

const named = (subject: RulingSubject): string => (subject.kind === "tag" ? subject.tag : subject.id);

const kindMatches = Effect.fnUntraced(function* (kind: SubjectKind, values: ReadonlyArray<string>) {
	const db = yield* Database;
	const rows = db.RulingSubject.where({ kind });
	const matching = {
		agent: rows.where((row) => row.agentId.in(values)),
		piece: rows.where((row) => row.pieceId.in(values)),
		repo: rows.where((row) => row.repoId.in(values)),
		tag: rows.where((row) => row.tag.in(values)),
		voyage: rows.where((row) => row.voyageId.in(values)),
	};
	return yield* matching[kind].all();
});

const byKind = (filter: ReadonlyArray<RulingSubject>): ReadonlyArray<readonly [SubjectKind, ReadonlyArray<string>]> => {
	const kinds = new Map<SubjectKind, Array<string>>();
	for (const subject of filter) {
		const values = kinds.get(subject.kind) ?? [];
		values.push(named(subject));
		kinds.set(subject.kind, values);
	}
	return [...kinds];
};

export const subjectMatches = Effect.fnUntraced(function* (filter: ReadonlyArray<RulingSubject>) {
	const found = yield* Effect.forEach(byKind(filter), ([kind, values]) => kindMatches(kind, values));
	return new Set(found.flat().map((row) => row.rulingId));
});
