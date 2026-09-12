import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { VoyageId } from "#ids.ts";
import { voyageProgress } from "#rows/voyage-progress.ts";

export const progress = query("progress", {
	input: { id: VoyageId },
	output: Schema.NullOr(voyageProgress.Row),
	reads: [voyageProgress],
	run: Effect.fn("voyages.progress")(function* (input, rows) {
		return Option.getOrNull(yield* rows.voyageProgress.find(input.id));
	}),
});
