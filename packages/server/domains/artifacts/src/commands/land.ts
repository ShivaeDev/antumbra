import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { Schema } from "effect";
import { artifactLanded } from "#facts/landed.ts";
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
});
