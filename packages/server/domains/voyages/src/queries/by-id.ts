import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { VoyageId } from "#ids.ts";
import { voyage } from "#rows/voyage.ts";

export const byId = query("byId", {
	input: { id: VoyageId },
	output: Schema.NullOr(voyage.Row),
	reads: [voyage],
	run: Effect.fn("voyages.byId")(function* (input, rows) {
		const stored = yield* rows.voyage.find(input.id);
		return Option.getOrNull(stored);
	}),
});
