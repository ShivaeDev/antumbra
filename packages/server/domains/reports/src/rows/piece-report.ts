import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { ReportId } from "#ids.ts";

export const pieceReport = row("pieceReport", { id: Schema.String, pieceId: PieceId, reportId: ReportId }, { key: "id", scope: "pieceId" });
export const pieceReportId = (pieceId: PieceId, reportId: ReportId): string => `${pieceId}/${reportId}`;
