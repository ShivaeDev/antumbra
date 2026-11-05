import type * as Source from "@antumbra/domain-artifacts/commands/supersede.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import type { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { endpoints } from "@antumbra/server-artifacts/logic/commands/lineage.ts";
import { selection as artifactSelection } from "@antumbra/server-storage/records/artifact.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const supersede = Effect.fn("Artifacts.supersede")(function* (
	input: typeof Source.supersede.Input.Type,
	reject: typeof Source.supersede.reject,
): Effect.fn.Return<typeof Source.supersede.emits.Payload.Type, RejectedBy<typeof Source.supersede.rejections>, Records> {
	const rows = yield* Records;

	const { before, after } = yield* endpoints(input, reject);
	if (before.supersededByArtifactId === after.id) return input;
	if (before.supersededByArtifactId !== null) return yield* reject.ArtifactLineageConflict({ conflict: "superseded_artifact_already_has_successor" });
	if ((yield* rows.artifact.count({ where: { supersededByArtifactId: after.id } }).pipe(Effect.orDie)) > 0)
		return yield* reject.ArtifactLineageConflict({ conflict: "successor_artifact_already_has_predecessor" });
	const held = yield* rows.artifact
		.findMany({ where: { pieceId: before.pieceId }, orderBy: { field: "storage_order", direction: "asc" }, select: artifactSelection })
		.pipe(Effect.orDie);
	const successor = new Map(held.map((entry) => [entry.id, entry.supersededByArtifactId]));
	let cursor: ArtifactId | null = after.id;
	while (cursor !== null) {
		if (cursor === before.id) return yield* reject.ArtifactLineageConflict({ conflict: "cycle" });
		cursor = successor.get(cursor) ?? null;
	}
	return input;
});
