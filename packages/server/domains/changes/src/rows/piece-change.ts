import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { PieceChangePurpose } from "@antumbra/platform-vocabulary/change.ts";
import { Schema } from "effect";
import { ChangeId } from "#ids.ts";
export const pieceChange = row(
	"pieceChange",
	{ id: Schema.String, pieceId: PieceId, changeId: ChangeId, purpose: PieceChangePurpose },
	{ key: "id", scope: "pieceId" },
);
export type PieceChangeRow = typeof pieceChange.Row.Type;
