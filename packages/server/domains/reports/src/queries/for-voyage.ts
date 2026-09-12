import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { ReportId } from "#ids.ts";
import { ReportReading } from "#queries/by-id.ts";
import { pieceReport } from "#rows/piece-report.ts";
import { report } from "#rows/report.ts";

export const forVoyage = query("forVoyage", {
	input: { id: ReportId, voyageId: VoyageId },
	output: Schema.NullOr(ReportReading),
	reads: [report, pieceReport, piece],
	run: Effect.fn("reports.forVoyage")(function* (input, rows) {
		const stored = yield* rows.report.find(input.id);
		if (Option.isNone(stored)) return null;
		const links = yield* rows.pieceReport.where({ reportId: input.id });
		const members = yield* rows.piece.where({ voyageId: input.voyageId });
		if (!links.some((link) => members.some((member) => member.id === link.pieceId))) return null;
		return { ...stored.value, pieceIds: links.map((link) => link.pieceId) };
	}),
});
