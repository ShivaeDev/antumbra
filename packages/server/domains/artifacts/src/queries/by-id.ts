import { query } from "@antumbra/platform-feature/query.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { Schema } from "effect";
import { artifact } from "#rows/artifact.ts";
export const byId = query("byId", {
	input: { id: ArtifactId },
	output: Schema.NullOr(artifact.Row),
	reads: [artifact],
});
