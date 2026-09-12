import { voyagePieceProgress } from "@antumbra/domain-voyages/rows/voyage-piece-progress.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";

export const pieceProgress = row(
	"pieceProgress",
	{
		id: PieceId,
		voyageId: voyagePieceProgress.fields.voyageId,
		state: voyagePieceProgress.fields.state,
		settledDone: Schema.Boolean,
		abandoned: Schema.Boolean,
		concluded: Schema.Boolean,
	},
	{ key: "id", scope: "voyageId" },
);
