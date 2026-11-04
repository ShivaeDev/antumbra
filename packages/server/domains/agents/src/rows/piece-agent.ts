import { row } from "@antumbra/platform-feature/row.ts";
import { PieceAgent } from "@antumbra/platform-vocabulary/change-evidence.ts";

export const pieceAgent = row("pieceAgent", PieceAgent.fields, { key: "id", scope: "pieceId" });
