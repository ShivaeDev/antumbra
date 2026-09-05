import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { decodeRuling } from "#read.ts";

export const awaitingAscent = Effect.fn("Rulings.awaitingAscent")(function* () {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ ruledAt: null })
		.where((ruling) => ruling.requesterAgentId.isNotNull())
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
	const rulings = yield* Effect.forEach(rows, decodeRuling);
	return rulings.filter((ruling) => Option.exists(ruling.rung, (rung) => rung !== "admiral"));
});
