import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { standing } from "#commands/guard.ts";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const replacements = query("replacements", {
	input: { rulingId: RulingId },
	output: Schema.Array(ruling.Row),
	reads: [ruling],
	run: Effect.fn("rulings.replacements")(function* (input, rows) {
		return (yield* rows.ruling.where({})).filter((item) => item.id !== input.rulingId && standing(item));
	}),
});
