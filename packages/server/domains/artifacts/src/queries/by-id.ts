import { query } from "@antumbra/platform-feature/query.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { Effect, Option, Schema } from "effect";
import { artifact } from "#rows/artifact.ts";
export const byId = query("byId", {
	input: { id: ArtifactId },
	output: Schema.NullOr(artifact.Row),
	reads: [artifact],
	run: Effect.fn("Artifacts.byId")(function* (input, rows) {
		return Option.getOrNull(yield* rows.artifact.find(input.id));
	}),
});
