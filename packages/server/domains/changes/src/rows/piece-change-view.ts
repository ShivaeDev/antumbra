import { row } from "@antumbra/platform-feature/row.ts";
import { PieceChangeView } from "@antumbra/platform-vocabulary/changes.ts";
export const pieceChangeView = row("pieceChangeView", PieceChangeView.fields, { key: "rowId", scope: "pieceId" });
