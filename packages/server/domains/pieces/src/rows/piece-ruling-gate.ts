import { row } from "@antumbra/platform-feature/row.ts";
import { PieceRulingGate } from "@antumbra/platform-vocabulary/piece-evidence.ts";

export const pieceRulingGate = row("pieceRulingGate", PieceRulingGate.fields, { key: "id", scope: "pieceId" });
