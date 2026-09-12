import { outcomeId } from "@antumbra/domain-pieces/ids.ts";
import { pieceOutcome } from "@antumbra/domain-pieces/rows/piece-outcome.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { reportLanded } from "#facts/report-landed.ts";
import { pieceReport, pieceReportId } from "#rows/piece-report.ts";
import { report } from "#rows/report.ts";

export const reportLandedMaterializer = materializer(reportLanded, {
	writes: [report, pieceReport, pieceOutcome],
	run: Effect.fn("reports.ReportLanded")(function* (fact, rows) {
		yield* rows.report.insert(fact);
		yield* rows.pieceReport.insert({ id: pieceReportId(fact.pieceId, fact.id), pieceId: fact.pieceId, reportId: fact.id });
		yield* rows.pieceOutcome.insert({
			id: outcomeId("report", fact.id, fact.pieceId),
			pieceId: fact.pieceId,
			sourceKind: "report",
			sourceId: fact.id,
			status: "landed",
		});
	}),
});
