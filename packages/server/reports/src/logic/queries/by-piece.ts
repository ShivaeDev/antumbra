import type * as Source from "@antumbra/domain-reports/queries/by-piece.ts";
import { report as reportRecordSchema } from "@antumbra/domain-reports/rows/report.ts";
import { selection as pieceReportSelection } from "@antumbra/server-storage/records/piece-report.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

export const byPiece = Effect.fn("reports.byPiece")(function* (
	input: Schema.Struct.Type<typeof Source.byPiece.input>,
): Effect.fn.Return<typeof Source.byPiece.output.Type, never, Records> {
	const rows = yield* Records;

	const links = yield* rows.pieceReport
		.findMany({ where: { pieceId: input.pieceId }, orderBy: { field: "storage_order", direction: "asc" }, select: pieceReportSelection })
		.pipe(Effect.orDie);
	return yield* Effect.forEach(links, (link) =>
		rows.report.findById(link.reportId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(reportRecordSchema.Row)), Effect.orDie),
	);
});
