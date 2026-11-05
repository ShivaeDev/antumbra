import type { artifactSupersessionRemoved } from "@antumbra/domain-artifacts/facts/supersession-removed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const supersessionRemovedMaterializer = Effect.fn("Artifacts.supersessionRemoved")(function* (
	fact: FactValue<typeof artifactSupersessionRemoved>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.artifact.updateVoid({ ...{ supersededByArtifactId: null }, id: fact.supersededArtifactId }).pipe(Effect.orDie);
});
