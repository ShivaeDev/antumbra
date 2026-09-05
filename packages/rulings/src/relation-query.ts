import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const relationQuery = Effect.fnUntraced(function* () {
	const db = yield* Database;
	return db.Ruling.include(
		"choices",
		db.RulingChoice.orderBy((choice) => choice.position.asc()),
	)
		.include(
			"reclassifications",
			db.RulingReclassification.orderBy((row) => row.at.asc()),
		)
		.include("gates")
		.include("subjects");
});
