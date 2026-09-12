import { outcomeId } from "@antumbra/domain-pieces/ids.ts";
import { pieceOutcome } from "@antumbra/domain-pieces/rows/piece-outcome.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { artifactLanded } from "#facts/landed.ts";
import { artifact } from "#rows/artifact.ts";
export const landedMaterializer = materializer(artifactLanded, {
	writes: [artifact, pieceOutcome],
	run: Effect.fn("Artifacts.landed")(function* (fact, rows) {
		yield* rows.artifact.insert({
			id: fact.id,
			pieceId: fact.pieceId,
			authorAgentId: fact.authorAgentId,
			title: fact.title,
			digest: fact.digest,
			byteSize: fact.byteSize,
			basename: fact.basename,
			supersededByArtifactId: null,
			createdAt: fact.at,
		});
		if (fact.supersedesArtifactId !== null) yield* rows.artifact.update(fact.supersedesArtifactId, { supersededByArtifactId: fact.id });
		yield* rows.pieceOutcome.insert({
			id: outcomeId("artifact", fact.id, fact.pieceId),
			pieceId: fact.pieceId,
			sourceKind: "artifact",
			sourceId: fact.id,
			status: "landed",
		});
	}),
});
