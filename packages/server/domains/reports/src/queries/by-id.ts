import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { ReportId } from "#ids.ts";
import { pieceReport } from "#rows/piece-report.ts";
import { report } from "#rows/report.ts";

export const ReportReading = Schema.Struct({ ...report.fields, pieceIds: Schema.Array(PieceId) });
export type ReportReading = typeof ReportReading.Type;

export const byId = query("byId", {
	input: { id: ReportId },
	output: Schema.NullOr(ReportReading),
	reads: [report, pieceReport],
	run: Effect.fn("reports.byId")(function* (input, rows) {
		const stored = yield* rows.report.find(input.id);
		if (Option.isNone(stored)) return null;
		const links = yield* rows.pieceReport.where({ reportId: input.id });
		return { ...stored.value, pieceIds: links.map((link) => link.pieceId) };
	}),
});
