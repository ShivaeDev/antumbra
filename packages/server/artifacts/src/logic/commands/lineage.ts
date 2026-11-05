import type { Reject } from "@antumbra/platform-feature/rejection.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, Schema } from "effect";
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
	reject: Reject<typeof lineageRejections>,
) {
	const rows = yield* Records;

	const before = yield* rows.artifact
		.findOne({
			where: { id: input.supersededArtifactId },
			orderBy: { field: "storage_order", direction: "asc" },
			select: ["id", "pieceId", "authorAgentId", "title", "digest", "byteSize", "basename", "supersededByArtifactId", "createdAt"],
		})
		.pipe(Effect.orDie);
	if (Option.isNone(before)) return yield* reject.ArtifactNotFound({ artifactId: input.supersededArtifactId });
	const after = yield* rows.artifact
		.findOne({
			where: { id: input.successorArtifactId },
			orderBy: { field: "storage_order", direction: "asc" },
			select: ["id", "pieceId", "authorAgentId", "title", "digest", "byteSize", "basename", "supersededByArtifactId", "createdAt"],
		})
		.pipe(Effect.orDie);
	if (Option.isNone(after)) return yield* reject.ArtifactNotFound({ artifactId: input.successorArtifactId });
	if (input.actorAgentId !== null && before.value.authorAgentId !== input.actorAgentId && after.value.authorAgentId !== input.actorAgentId) {
		return yield* reject.ArtifactSupersessionUnauthorized({ actorAgentId: input.actorAgentId });
	}
	if (before.value.pieceId !== after.value.pieceId)
		return yield* reject.ArtifactProvenanceConflict({ supersededArtifactId: before.value.id, successorArtifactId: after.value.id });
	return { before: before.value, after: after.value };
});
