import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { RulingId } from "#ids.ts";
import { Choice, ruling } from "#rows/ruling.ts";
export const choices = query("choices", {
	input: { rulingId: RulingId },
	output: Schema.Array(Choice),
	reads: [ruling],
	run: Effect.fn("rulings.choices")(function* (input, rows) {
		const found = yield* rows.ruling.find(input.rulingId);
		if (Option.isNone(found)) return [];
		const current = found.value;
		return [...current.choices].sort(
			(a, b) => Number(b.id === current.recommendation?.choiceId) - Number(a.id === current.recommendation?.choiceId) || a.position - b.position,
		);
	}),
});
