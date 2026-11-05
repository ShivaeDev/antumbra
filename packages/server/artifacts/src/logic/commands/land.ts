import type * as Source from "@antumbra/domain-artifacts/commands/land.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { selection as artifactSelection } from "@antumbra/server-storage/records/artifact.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const land = Effect.fn("Artifacts.land")(function* (
	input: typeof Source.land.Input.Type,
	reject: typeof Source.land.reject,
): Effect.fn.Return<typeof Source.land.emits.Payload.Type, RejectedBy<typeof Source.land.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.piece.count({ where: { id: input.pieceId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownPiece({ pieceId: input.pieceId });
	if (input.supersedesArtifactId !== null) {
		const previous = yield* rows.artifact
			.findOne({ where: { id: input.supersedesArtifactId }, orderBy: { field: "storage_order", direction: "asc" }, select: artifactSelection })
			.pipe(Effect.orDie);
		if (Option.isNone(previous)) return yield* reject.ArtifactNotFound({ artifactId: input.supersedesArtifactId });
		if (previous.value.pieceId !== input.pieceId)
			return yield* reject.ArtifactProvenanceConflict({ supersededArtifactId: previous.value.id, successorPieceId: input.pieceId });
		if (previous.value.supersededByArtifactId !== null) return yield* reject.ArtifactLineageConflict({ artifactId: previous.value.id });
	}
	return {
		id: ArtifactId.make(input.requestId),
		pieceId: input.pieceId,
		authorAgentId: input.authorAgentId,
		title: input.title,
		digest: input.digest,
		byteSize: input.byteSize,
		basename: input.basename,
		supersedesArtifactId: input.supersedesArtifactId,
	};
});
