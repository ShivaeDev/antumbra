import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { standing as isStanding } from "#commands/guard.ts";
import { matches } from "#queries/order.ts";
import { ruling, Subject } from "#rows/ruling.ts";
export const binding = query("binding", {
	input: { subjects: Schema.Array(Subject) },
	output: Schema.Array(ruling.Row),
	reads: [ruling],
	run: Effect.fn("rulings.binding")(function* (input, rows) {
		return (yield* rows.ruling.where({}))
			.filter((item) => isStanding(item) && (item.radius === "fleet" || matches(item, input.subjects)))
			.sort((a, b) => (b.answer?.at ?? "").localeCompare(a.answer?.at ?? ""));
	}),
});
