import { row } from "@antumbra/platform-feature/row.ts";
import { PieceOutcome } from "@antumbra/platform-vocabulary/piece-evidence.ts";

export const pieceOutcome = row("pieceOutcome", PieceOutcome.fields, { key: "id", scope: "pieceId" });
