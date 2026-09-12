import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { berth } from "#rows/berth.ts";

export const claims = query("claims", {
	input: {},
	output: Schema.Array(berth.Row),
	reads: [berth],
	run: Effect.fn("Reclamation.claims")(function* (_input, rows) {
		return yield* rows.berth.where({ reclaimState: "claimed" });
	}),
});
