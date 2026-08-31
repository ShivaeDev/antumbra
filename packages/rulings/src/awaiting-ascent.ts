import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { loadRuling } from "#read.ts";

export const awaitingAscent = Effect.fn("rulings.awaitingAscent")(function* () {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ ruledAt: null })
		.where((ruling) => ruling.requesterAgentId.isNotNull())
		.orderBy((ruling) => ruling.createdAt.asc())
		.all();
	const asked = yield* Effect.forEach(rows, loadRuling);
	return asked.filter((ruling) => Option.exists(ruling.rung, (rung) => rung !== "admiral"));
});
