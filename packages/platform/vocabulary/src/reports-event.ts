import { Schema } from "effect";
import { PieceId } from "#piece.ts";
import { Report } from "#reports.ts";
export const ReportLandedPayload = Schema.Struct({ ...Report.fields, pieceId: PieceId });
export const ReportsEvent = Schema.Union([Schema.Struct({ _tag: Schema.Literal("ReportLanded"), ...ReportLandedPayload.fields, at: Schema.Number })]);
