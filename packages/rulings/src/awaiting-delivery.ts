import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { loadRuling } from "#read.ts";

// why: the answer owes its asker one delivery, and the row is the whole record
// of whether that debt is paid — so the set is read from durable truth on every
// pass instead of from anything a process remembered. An authority that
// answered its own question is owed nothing and never joins the set.
export const awaitingDelivery = Effect.fn("rulings.awaitingDelivery")(
	function* () {
		const db = yield* Database;
		const rows = yield* db.Ruling.where({ deliveredAt: null })
			.where((ruling) => ruling.ruledAt.isNotNull())
			.where((ruling) => ruling.requesterAgentId.isNotNull())
			.orderBy((ruling) => ruling.ruledAt.asc())
			.all();
		return yield* Effect.forEach(rows, loadRuling);
	},
);
