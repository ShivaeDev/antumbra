import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { openOrder } from "#queries/order.ts";
import { ruling } from "#rows/ruling.ts";
export const open = query("open", {
	input: {},
	output: Schema.Array(ruling.Row),
	reads: [ruling],
	run: Effect.fn("rulings.open")(function* (_input, rows) {
		const all = yield* rows.ruling.where({});
		return all.filter((ruling) => ruling.answer === null).sort(openOrder);
	}),
});
