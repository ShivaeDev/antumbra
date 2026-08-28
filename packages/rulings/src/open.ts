import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { inOpenOrder } from "#order.ts";
import { loadRuling } from "#read.ts";

export const open = Effect.fn("rulings.open")(function* () {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ ruledAt: null }).all();
	const rulings = yield* Effect.forEach(rows, loadRuling);
	return [...rulings].sort(inOpenOrder);
});
