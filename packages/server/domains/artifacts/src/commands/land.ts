import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { artifactLanded } from "#facts/landed.ts";
import { ArtifactId } from "#ids.ts";
import { artifact } from "#rows/artifact.ts";
export const land = command("land", {
	input: {
		pieceId: PieceId,
		authorAgentId: Schema.NullOr(Schema.String),
		title: Schema.String,
		digest: Schema.String,
		byteSize: Schema.Number,
		basename: Schema.String,
		supersedesArtifactId: Schema.NullOr(ArtifactId),
	},
	reads: [piece, artifact],
	emits: artifactLanded,
	rejections: {
		UnknownPiece: { pieceId: PieceId },
		ArtifactNotFound: { artifactId: ArtifactId },
		ArtifactProvenanceConflict: { supersededArtifactId: ArtifactId, successorPieceId: PieceId },
		ArtifactLineageConflict: { artifactId: ArtifactId },
	},
	run: Effect.fn("Artifacts.land")(function* (input, rows, reject) {
		if (!(yield* rows.piece.exists(input.pieceId))) return yield* reject.UnknownPiece({ pieceId: input.pieceId });
		if (input.supersedesArtifactId !== null) {
			const previous = yield* rows.artifact.find(input.supersedesArtifactId);
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
	}),
});
