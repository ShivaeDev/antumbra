import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingSubject } from "#model.ts";
import { loadRuling } from "#read.ts";
import type { StoredRuling } from "#stored-rows.ts";

type SubjectKind = RulingSubject["kind"];

const named = (subject: RulingSubject): string =>
	subject.kind === "tag" ? subject.tag : subject.id;

// why: exactly one column carries a subject, so entries of one kind differ only
// in what that column must hold — the whole kind is asked for in one query
// rather than one query per entry.
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

const byKind = (
	filter: ReadonlyArray<RulingSubject>,
): ReadonlyArray<readonly [SubjectKind, ReadonlyArray<string>]> => {
	const kinds = new Map<SubjectKind, Array<string>>();
	for (const subject of filter) {
		kinds.set(subject.kind, [
			...(kinds.get(subject.kind) ?? []),
			named(subject),
		]);
	}
	return [...kinds];
};

const subjectMatches = (filter: ReadonlyArray<RulingSubject>) =>
	Effect.gen(function* () {
		const found = yield* Effect.forEach(byKind(filter), ([kind, values]) =>
			kindMatches(kind, values),
		);
		return new Set(found.flat().map((row) => row.rulingId));
	});

const scoped = (
	rows: ReadonlyArray<StoredRuling>,
	filter: ReadonlyArray<RulingSubject>,
) =>
	Effect.gen(function* () {
		if (filter.length === 0) {
			return rows;
		}
		const matched = yield* subjectMatches(filter);
		return rows.filter((row) => matched.has(row.id));
	});

// why: a ruling stands once ruled and until it is superseded, and precedent is
// read newest first so the latest word about a scope is the first one an
// asker meets. Both halves of standing are asked of the record rather than
// sieved out of every ruling ever ruled; a superseded ruling stays reachable
// by id, it just binds no one. Two rulings can be ruled in the same
// millisecond, and then the one raised later reads as the later word — an
// order the record settles rather than one the query plan happens to pick.
export const standing = Effect.fn("rulings.standing")(function* (
	filter: ReadonlyArray<RulingSubject>,
) {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ supersededById: null })
		.where((ruling) => ruling.ruledAt.isNotNull())
		.orderBy([
			(ruling) => ruling.ruledAt.desc(),
			(ruling) => ruling.createdAt.desc(),
		])
		.all();
	return yield* Effect.forEach(yield* scoped(rows, filter), loadRuling);
});
