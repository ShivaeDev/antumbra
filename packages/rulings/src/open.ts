import { Effect } from "effect";
import { inOpenOrder } from "#order.ts";
import { decodeRuling } from "#read.ts";
import { relationQuery } from "#relation-query.ts";

export const open = Effect.fn("Rulings.open")(function* () {
	const rows = yield* (yield* relationQuery()).where({ ruledAt: null }).all();
	const rulings = yield* Effect.forEach(rows, decodeRuling);
	return rulings.sort(inOpenOrder);
});
