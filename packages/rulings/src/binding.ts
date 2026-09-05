import { Database, or } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingSubject } from "#model.ts";
import { decodeRuling } from "#read.ts";
import { subjectMatches } from "#subject-matches.ts";

export const binding = Effect.fn("Rulings.binding")(function* (subjects: ReadonlyArray<RulingSubject>) {
	const matched = yield* subjectMatches(subjects);
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ supersededById: null, withdrawnAt: null })
		.where((ruling) => ruling.ruledAt.isNotNull())
		.where((ruling) => or(ruling.id.in([...matched]), ruling.radius.eq("fleet"), ruling.reclassifications.some({ radius: "fleet" })))
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
		.include("subjects")
		.all();
	const candidates = yield* Effect.forEach(rows, decodeRuling);
	return candidates.filter((ruling) => ruling.radius === "fleet" || matched.has(ruling.id));
});
