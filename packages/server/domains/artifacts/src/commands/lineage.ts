import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import type { Reject } from "@antumbra/platform-feature/rejection.ts";
import { Effect, Option, Schema } from "effect";
import { ArtifactId } from "#ids.ts";
import type { artifact } from "#rows/artifact.ts";
export const lineageInput = { supersededArtifactId: ArtifactId, successorArtifactId: ArtifactId, actorAgentId: Schema.NullOr(Schema.String) };
export const lineageRejections = {
	ArtifactNotFound: { artifactId: ArtifactId },
	ArtifactProvenanceConflict: { supersededArtifactId: ArtifactId, successorArtifactId: ArtifactId },
	ArtifactSupersessionUnauthorized: { actorAgentId: Schema.String },
	ArtifactLineageConflict: {
		conflict: Schema.Literals(["cycle", "successor_artifact_already_has_predecessor", "superseded_artifact_already_has_successor"]),
	},
	ArtifactSupersessionNotFound: { supersededArtifactId: ArtifactId, successorArtifactId: ArtifactId },
};
export const endpoints = Effect.fn("Artifacts.endpoints")(function* (
	input: Schema.Struct<typeof lineageInput>["Type"],
	rows: ReadHandles<readonly [typeof artifact]>,
	reject: Reject<typeof lineageRejections>,
) {
	const before = yield* rows.artifact.find(input.supersededArtifactId);
	if (Option.isNone(before)) return yield* reject.ArtifactNotFound({ artifactId: input.supersededArtifactId });
	const after = yield* rows.artifact.find(input.successorArtifactId);
	if (Option.isNone(after)) return yield* reject.ArtifactNotFound({ artifactId: input.successorArtifactId });
	if (input.actorAgentId !== null && before.value.authorAgentId !== input.actorAgentId && after.value.authorAgentId !== input.actorAgentId) {
		return yield* reject.ArtifactSupersessionUnauthorized({ actorAgentId: input.actorAgentId });
	}
	if (before.value.pieceId !== after.value.pieceId)
		return yield* reject.ArtifactProvenanceConflict({ supersededArtifactId: before.value.id, successorArtifactId: after.value.id });
	return { before: before.value, after: after.value };
});
