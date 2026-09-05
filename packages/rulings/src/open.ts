import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { inOpenOrder } from "#order.ts";
import { decodeRuling } from "#read.ts";

export const open = Effect.fn("Rulings.open")(function* () {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ ruledAt: null })
		.include(
			"choices",
			db.RulingChoice.orderBy((choice) => choice.position.asc()),
		)
		.include(
			"reclassifications",
			db.RulingReclassification.orderBy((row) => row.at.asc()),
		)
		.include("gates")
		.include("subjects")
		.all();
	const rulings = yield* Effect.forEach(rows, decodeRuling);
	return rulings.sort(inOpenOrder);
});
