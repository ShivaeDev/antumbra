import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { change } from "#rows/change.ts";
export const pieceChangeView = row(
	"pieceChangeView",
	{ ...change.fields, rowId: Schema.String, pieceId: PieceId, repoName: Schema.String },
	{ key: "rowId", scope: "pieceId" },
);
