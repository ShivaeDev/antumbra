import { Database, or } from "@antumbra/persistence";
import { Effect } from "effect";
import { decodeRuling } from "#read.ts";

export const awaitingAscent = Effect.fn("Rulings.awaitingAscent")(function* () {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ ruledAt: null })
		.where((ruling) => ruling.requesterAgentId.isNotNull())
		.where((ruling) => or(ruling.rung.isNull(), ruling.rung.neq("admiral")))
		.orderBy((ruling) => ruling.createdAt.asc())
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
