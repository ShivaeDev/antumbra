import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { artifactSupersessionRemoved } from "#facts/supersession-removed.ts";
import { artifact } from "#rows/artifact.ts";
export const supersessionRemovedMaterializer = materializer(artifactSupersessionRemoved, {
	writes: [artifact],
	run: Effect.fn("Artifacts.supersessionRemoved")(function* (fact, rows) {
		yield* rows.artifact.update(fact.supersededArtifactId, { supersededByArtifactId: null });
	}),
});
