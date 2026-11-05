import { row } from "@antumbra/platform-feature/row.ts";
import { Piece } from "@antumbra/platform-vocabulary/piece.ts";
import { PieceOutcome } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { PieceReport, Report } from "@antumbra/platform-vocabulary/reports.ts";
import { Records } from "#records.ts";
export const piece = row("piece", Piece.fields, { key: "id", scope: "voyageId" });
export const pieceOutcome = row("pieceOutcome", PieceOutcome.fields, { key: "id", scope: "pieceId" });

export const report = row("report", Report.fields, { key: "id" });
export const pieceReport = row("pieceReport", PieceReport.fields, { key: "id", scope: "pieceId" });
export const rows = Records;
