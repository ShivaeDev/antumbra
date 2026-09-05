import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingSubject } from "#model.ts";
import { decodeRuling } from "#read.ts";

import { subjectMatches } from "#subject-matches.ts";

export const standing = Effect.fn("Rulings.standing")(function* (filter: ReadonlyArray<RulingSubject>) {
	const matched = filter.length === 0 ? undefined : yield* subjectMatches(filter);
	const db = yield* Database;
	const query = db.Ruling.where({ supersededById: null, withdrawnAt: null })
		.where((ruling) => ruling.ruledAt.isNotNull())
		.orderBy((ruling) => ruling.ruledAt.desc())
		.include(
			"choices",
			db.RulingChoice.orderBy((choice) => choice.position.asc()),
		)
		.include(
			"contexts",
			db.RulingContext.orderBy((row) => row.at.asc()),
		)
		.include(
			"reclassifications",
			db.RulingReclassification.orderBy((row) => row.at.asc()),
		)
		.include("gates")
		.include("subjects");
	const rows = yield* (matched === undefined ? query : query.where((ruling) => ruling.id.in([...matched]))).all();
	return yield* Effect.forEach(rows, decodeRuling);
});
