import { row } from "@antumbra/platform-feature/row.ts";
import { PieceProgress } from "@antumbra/platform-vocabulary/piece.ts";

export const pieceProgress = row("pieceProgress", PieceProgress.fields, { key: "id", scope: "voyageId" });
