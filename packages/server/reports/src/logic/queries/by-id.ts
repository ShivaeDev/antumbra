import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import type * as Source from "@antumbra/domain-reports/queries/by-id.ts";
import { report } from "@antumbra/domain-reports/rows/report.ts";
import { selection as pieceReportSelection } from "@antumbra/server-storage/records/piece-report.ts";
import { selection as reportSelection } from "@antumbra/server-storage/records/report.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, Schema } from "effect";

export const ReportReading = Schema.Struct({ ...report.fields, pieceIds: Schema.Array(PieceId) });
export type ReportReading = typeof ReportReading.Type;

export const byId = Effect.fn("reports.byId")(function* (
	input: Schema.Struct.Type<typeof Source.byId.input>,
): Effect.fn.Return<typeof Source.byId.output.Type, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.report
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: reportSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(stored)) return null;
	const links = yield* rows.pieceReport
		.findMany({ where: { reportId: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: pieceReportSelection })
		.pipe(Effect.orDie);
	return { ...stored.value, pieceIds: links.map((link) => link.pieceId) };
});
