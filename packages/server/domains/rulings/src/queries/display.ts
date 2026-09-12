import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { openOrder } from "#queries/order.ts";
import { rulingDisplay } from "#rows/display.ts";
export const display = query("display", {
	input: {},
	output: Schema.Struct({ open: Schema.Array(rulingDisplay.Row), standing: Schema.Array(rulingDisplay.Row) }),
	reads: [rulingDisplay],
	run: Effect.fn("rulings.display")(function* (_input, rows) {
		const all = yield* rows.rulingDisplay.where({});
		return {
			open: all.filter((ruling) => ruling.answer === null).sort(openOrder),
			standing: all
				.filter((ruling) => ruling.answer !== null && ruling.supersession === null && ruling.withdrawal === null)
				.sort((a, b) => (b.answer?.at ?? "").localeCompare(a.answer?.at ?? "")),
		};
	}),
});
