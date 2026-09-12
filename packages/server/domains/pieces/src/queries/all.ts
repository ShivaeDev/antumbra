import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { piece } from "#rows/piece.ts";

export const all = query("all", {
	input: {},
	output: Schema.Array(piece.Row),
	reads: [piece],
	run: Effect.fn("pieces.all")(function* (_input, rows) {
		const stored = yield* rows.piece.where({});
		return stored.toSorted((left, right) => left.charteredAt.localeCompare(right.charteredAt));
	}),
});
