import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingSubject, StoredRuling } from "#model.ts";
import { loadRuling } from "#read.ts";
import { subjectColumns } from "#subjects.ts";

const subjectMatches = (filter: ReadonlyArray<RulingSubject>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const found = yield* Effect.forEach(filter, (subject) =>
			db.RulingSubject.where(subjectColumns(subject)).select("rulingId").all(),
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

// why: a ruling stands once ruled, and precedent is read newest first so the
// latest word about a scope is the first one an asker meets.
export const standing = Effect.fn("rulings.standing")(function* (
	filter: ReadonlyArray<RulingSubject>,
) {
	const db = yield* Database;
	const rows = yield* db.Ruling.where((ruling) => ruling.ruledAt.isNotNull())
		.orderBy((ruling) => ruling.ruledAt.desc())
		.all();
	return yield* Effect.forEach(yield* scoped(rows, filter), loadRuling);
});
