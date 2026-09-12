import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { capacity } from "#rows/capacity.ts";

export const providers = query("providers", {
	input: {},
	output: Schema.Array(capacity.Row),
	reads: [capacity],
	run: Effect.fn("capacity.providers")(function* (_input, rows) {
		return yield* rows.capacity.where({});
	}),
});
