import type * as Source from "@antumbra/domain-reports/queries/for-voyage.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { selection as pieceReportSelection } from "@antumbra/server-storage/records/piece-report.ts";
import { selection as reportSelection } from "@antumbra/server-storage/records/report.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";

export const forVoyage = Effect.fn("reports.forVoyage")(function* (
	input: Schema.Struct.Type<typeof Source.forVoyage.input>,
): Effect.fn.Return<typeof Source.forVoyage.output.Type, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.report
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: reportSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(stored)) return null;
	const links = yield* rows.pieceReport
		.findMany({ where: { reportId: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: pieceReportSelection })
		.pipe(Effect.orDie);
	const members = yield* rows.piece
		.findMany({ where: { voyageId: input.voyageId }, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection })
		.pipe(Effect.orDie);
	if (!links.some((link) => members.some((member) => member.id === link.pieceId))) return null;
	return { ...stored.value, pieceIds: links.map((link) => link.pieceId) };
});
