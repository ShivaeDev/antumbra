import { row } from "@antumbra/platform-feature/row.ts";
import { PieceEdge } from "@antumbra/platform-vocabulary/piece.ts";

export const pieceEdge = row("pieceEdge", PieceEdge.fields, { key: "id", scope: "to" });
