import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingSubject } from "#model.ts";
import { loadRuling } from "#read.ts";

type SubjectKind = RulingSubject["kind"];

const named = (subject: RulingSubject): string => (subject.kind === "tag" ? subject.tag : subject.id);

const kindMatches = (kind: SubjectKind, values: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = db.RulingSubject.where({ kind });
		const matching = {
			agent: rows.where((row) => row.agentId.in(values)),
			piece: rows.where((row) => row.pieceId.in(values)),
			repo: rows.where((row) => row.repoId.in(values)),
			tag: rows.where((row) => row.tag.in(values)),
			voyage: rows.where((row) => row.voyageId.in(values)),
		};
		return yield* matching[kind].select("rulingId").all();
	});

const byKind = (filter: ReadonlyArray<RulingSubject>): ReadonlyArray<readonly [SubjectKind, ReadonlyArray<string>]> => {
	const kinds = new Map<SubjectKind, Array<string>>();
	for (const subject of filter) {
		kinds.set(subject.kind, [...(kinds.get(subject.kind) ?? []), named(subject)]);
	}
	return [...kinds];
};

const subjectMatches = (filter: ReadonlyArray<RulingSubject>) =>
	Effect.gen(function* () {
		const found = yield* Effect.forEach(byKind(filter), ([kind, values]) => kindMatches(kind, values));
		return new Set(found.flat().map((row) => row.rulingId));
	});

export const standing = Effect.fn("rulings.standing")(function* (filter: ReadonlyArray<RulingSubject>) {
	const db = yield* Database;
	const matched = filter.length === 0 ? undefined : yield* subjectMatches(filter);
	const query = db.Ruling.where({
		supersededById: null,
		withdrawnAt: null,
	})
		.where((ruling) => ruling.ruledAt.isNotNull())
		.orderBy((ruling) => ruling.ruledAt.desc());
	const rows = yield* (matched === undefined ? query : query.where((ruling) => ruling.id.in([...matched]))).all();
	return yield* Effect.forEach(rows, loadRuling);
});
