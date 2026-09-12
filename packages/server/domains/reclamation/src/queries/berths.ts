import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { berth } from "#rows/berth.ts";

export const berths = query("berths", {
	input: { agentId: Schema.String },
	output: Schema.Array(berth.Row),
	reads: [berth],
	scope: (input) => input.agentId,
	run: Effect.fn("Reclamation.berths")(function* (input, rows) {
		return yield* rows.berth.where(input);
	}),
});
