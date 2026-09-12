import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { ArtifactId } from "#ids.ts";
export const artifact = row(
	"artifact",
	{
		id: ArtifactId,
		pieceId: PieceId,
		authorAgentId: Schema.NullOr(Schema.String),
		title: Schema.String,
		digest: Schema.String,
		byteSize: Schema.Number,
		basename: Schema.String,
		supersededByArtifactId: Schema.NullOr(ArtifactId),
		createdAt: Schema.Number,
	},
	{ key: "id", scope: "pieceId" },
);
