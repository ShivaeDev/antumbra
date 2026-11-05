import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { ReportId } from "@antumbra/platform-vocabulary/reports-ids.ts";
import { Schema } from "effect";
import { pieceReport } from "#rows/piece-report.ts";
import { report } from "#rows/report.ts";

export const ReportReading = Schema.Struct({ ...report.fields, pieceIds: Schema.Array(PieceId) });
export type ReportReading = typeof ReportReading.Type;

export const byId = query("byId", {
	input: { id: ReportId },
	output: Schema.NullOr(ReportReading),
	reads: [report, pieceReport],
});
