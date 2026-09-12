import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
export const rulingGate = row(
	"rulingGate",
	{ id: Schema.String, rulingId: RulingId, pieceId: PieceId, question: Schema.String, open: Schema.Boolean },
	{ key: "id", scope: "rulingId" },
);
