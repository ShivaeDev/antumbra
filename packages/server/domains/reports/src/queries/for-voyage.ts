import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { ReportId } from "@antumbra/platform-vocabulary/reports-ids.ts";
import { Schema } from "effect";
import { ReportReading } from "#queries/by-id.ts";
import { pieceReport } from "#rows/piece-report.ts";
import { report } from "#rows/report.ts";

export const forVoyage = query("forVoyage", {
	input: { id: ReportId, voyageId: VoyageId },
	output: Schema.NullOr(ReportReading),
	reads: [report, pieceReport, piece],
});
