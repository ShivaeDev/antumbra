import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { moorage } from "#rows/moorage.ts";

export const current = query("current", {
	input: { agentId: Schema.String },
	output: Schema.Option(moorage.Row),
	reads: [moorage],
	run: Effect.fn("Reclamation.current")(function* (input, rows) {
		return yield* rows.moorage.find(input.agentId);
	}),
});
