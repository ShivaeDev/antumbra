import { Effect } from "effect";
import { decodeRuling } from "#read.ts";
import { relationQuery } from "#relation-query.ts";

export const awaitingDelivery = Effect.fn("Rulings.awaitingDelivery")(function* () {
	const rows = yield* (yield* relationQuery())
		.where({ deliveredAt: null })
		.where((ruling) => ruling.ruledAt.isNotNull())
		.where((ruling) => ruling.requesterAgentId.isNotNull())
		.orderBy((ruling) => ruling.ruledAt.asc())
		.all();
	return yield* Effect.forEach(rows, decodeRuling);
});
