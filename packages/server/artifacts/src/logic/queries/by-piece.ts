import type * as Source from "@antumbra/domain-artifacts/queries/by-piece.ts";
import { selection as artifactSelection } from "@antumbra/server-storage/records/artifact.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const byPiece = Effect.fn("Artifacts.byPiece")(function* (
	input: Schema.Struct.Type<typeof Source.byPiece.input>,
): Effect.fn.Return<typeof Source.byPiece.output.Type, never, Records> {
	const rows = yield* Records;

	const artifacts = yield* rows.artifact
		.findMany({ where: { pieceId: input.pieceId }, orderBy: { field: "storage_order", direction: "asc" }, select: artifactSelection })
		.pipe(Effect.orDie);
	return {
		current: artifacts.filter((held) => held.supersededByArtifactId === null),
		history: artifacts.filter((held) => held.supersededByArtifactId !== null),
	};
});
