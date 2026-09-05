import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { inOpenOrder } from "#order.ts";
import { decodeRuling } from "#read.ts";

export const frontier = Effect.fn("Rulings.frontier")(function* (voyageId: string) {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ ruledAt: null, parkedAt: null })
		.where((ruling) => ruling.requesterAgentId.isNotNull())
		.where((ruling) => ruling.subjects.some({ kind: "voyage", voyageId }))
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
	return (yield* Effect.forEach(rows, decodeRuling)).sort(inOpenOrder);
});
