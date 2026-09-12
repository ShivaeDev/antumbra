import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { ArtifactId } from "#ids.ts";
import { artifact } from "#rows/artifact.ts";
export const byId = query("byId", {
	input: { id: ArtifactId },
	output: Schema.NullOr(artifact.Row),
	reads: [artifact],
	run: Effect.fn("Artifacts.byId")(function* (input, rows) {
		return Option.getOrNull(yield* rows.artifact.find(input.id));
	}),
});
