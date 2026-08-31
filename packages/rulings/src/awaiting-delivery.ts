import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { loadRuling } from "#read.ts";

export const awaitingDelivery = Effect.fn("rulings.awaitingDelivery")(function* () {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ deliveredAt: null })
		.where((ruling) => ruling.ruledAt.isNotNull())
		.where((ruling) => ruling.requesterAgentId.isNotNull())
		.orderBy((ruling) => ruling.ruledAt.asc())
		.all();
	return yield* Effect.forEach(rows, loadRuling);
});
