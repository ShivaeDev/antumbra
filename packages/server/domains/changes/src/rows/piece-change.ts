import { row } from "@antumbra/platform-feature/row.ts";
import { PieceChange } from "@antumbra/platform-vocabulary/changes.ts";
export const pieceChange = row("pieceChange", PieceChange.fields, { key: "id", scope: "pieceId" });
export type PieceChangeRow = typeof pieceChange.Row.Type;
