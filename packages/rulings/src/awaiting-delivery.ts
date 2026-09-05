import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { decodeRuling } from "#read.ts";

export const awaitingDelivery = Effect.fn("Rulings.awaitingDelivery")(function* () {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ deliveredAt: null })
		.where((ruling) => ruling.ruledAt.isNotNull())
		.where((ruling) => ruling.requesterAgentId.isNotNull())
		.orderBy((ruling) => ruling.ruledAt.asc())
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
	return yield* Effect.forEach(rows, decodeRuling);
});
