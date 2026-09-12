import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";

export const pieceOutcome = row(
	"pieceOutcome",
	{
		id: Schema.String,
		pieceId: PieceId,
		sourceKind: Schema.Literals(["report", "artifact", "change"]),
		sourceId: Schema.String,
		status: Schema.Literals(["landed", "pending"]),
	},
	{ key: "id", scope: "pieceId" },
);
