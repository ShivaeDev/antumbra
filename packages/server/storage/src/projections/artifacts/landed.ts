import type { artifactLanded } from "@antumbra/domain-artifacts/facts/landed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { outcomeId } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const landedMaterializer = Effect.fn("Artifacts.landed")(function* (
	fact: FactValue<typeof artifactLanded>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.artifact
		.insertVoid({
			id: fact.id,
			pieceId: fact.pieceId,
			authorAgentId: fact.authorAgentId,
			title: fact.title,
			digest: fact.digest,
			byteSize: fact.byteSize,
			basename: fact.basename,
			supersededByArtifactId: null,
			createdAt: fact.at,
		})
		.pipe(Effect.orDie);
	if (fact.supersedesArtifactId !== null)
		yield* rows.artifact.updateVoid({ ...{ supersededByArtifactId: fact.id }, id: fact.supersedesArtifactId }).pipe(Effect.orDie);
	yield* rows.pieceOutcome
		.insertVoid({
			id: outcomeId("artifact", fact.id, fact.pieceId),
			pieceId: fact.pieceId,
			sourceKind: "artifact",
			sourceId: fact.id,
			status: "landed",
		})
		.pipe(Effect.orDie);
});
