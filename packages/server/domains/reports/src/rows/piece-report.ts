import { row } from "@antumbra/platform-feature/row.ts";
import { PieceReport } from "@antumbra/platform-vocabulary/reports.ts";
export const pieceReport = row("pieceReport", PieceReport.fields, { key: "id", scope: "pieceId" });
