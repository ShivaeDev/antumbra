import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";

export const pieceRulingGate = row(
	"pieceRulingGate",
	{
		id: Schema.String,
		pieceId: PieceId,
		rulingId: Schema.String,
	},
	{ key: "id", scope: "pieceId" },
);
