import type { artifactSuperseded } from "@antumbra/domain-artifacts/facts/superseded.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const supersededMaterializer = Effect.fn("Artifacts.superseded")(function* (
	fact: FactValue<typeof artifactSuperseded>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.artifact.updateVoid({ ...{ supersededByArtifactId: fact.successorArtifactId }, id: fact.supersededArtifactId }).pipe(Effect.orDie);
});
