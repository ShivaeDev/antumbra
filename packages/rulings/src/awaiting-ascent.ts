import { Effect, Option } from "effect";
import { decodeRuling } from "#read.ts";
import { relationQuery } from "#relation-query.ts";

export const awaitingAscent = Effect.fn("Rulings.awaitingAscent")(function* () {
	const rows = yield* (yield* relationQuery())
		.where({ ruledAt: null })
		.where((ruling) => ruling.requesterAgentId.isNotNull())
		.orderBy((ruling) => ruling.createdAt.asc())
		.all();
	const asked = yield* Effect.forEach(rows, decodeRuling);
	return asked.filter((ruling) => Option.exists(ruling.rung, (rung) => rung !== "admiral"));
});
