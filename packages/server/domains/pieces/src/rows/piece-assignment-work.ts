import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";

export const pieceAssignmentWork = row(
	"pieceAssignmentWork",
	{
		id: Schema.String,
		pieceId: PieceId,
		agentId: Schema.String,
		working: Schema.Boolean,
	},
	{ key: "id", scope: "pieceId" },
);
