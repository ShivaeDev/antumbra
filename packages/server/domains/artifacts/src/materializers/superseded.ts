import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { artifactSuperseded } from "#facts/superseded.ts";
import { artifact } from "#rows/artifact.ts";
export const supersededMaterializer = materializer(artifactSuperseded, {
	writes: [artifact],
	run: Effect.fn("Artifacts.superseded")(function* (fact, rows) {
		yield* rows.artifact.update(fact.supersededArtifactId, { supersededByArtifactId: fact.successorArtifactId });
	}),
});
