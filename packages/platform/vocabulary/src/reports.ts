import { Schema } from "effect";
import { PieceId } from "#piece.ts";
import { ReportId } from "#reports-ids.ts";
export const Report = Schema.Struct({
	id: ReportId,
	authorAgentId: Schema.NullOr(Schema.String),
	title: Schema.String,
	body: Schema.String,
	createdAt: Schema.String,
});
export const PieceReport = Schema.Struct({ id: Schema.String, pieceId: PieceId, reportId: ReportId });
export const pieceReportId = (pieceId: PieceId, reportId: ReportId): string => `${pieceId}/${reportId}`;
