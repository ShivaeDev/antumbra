import { row } from "@antumbra/platform-feature/row.ts";
import { PieceAssignmentWork } from "@antumbra/platform-vocabulary/piece-evidence.ts";

export const pieceAssignmentWork = row("pieceAssignmentWork", PieceAssignmentWork.fields, { key: "id", scope: "pieceId" });
