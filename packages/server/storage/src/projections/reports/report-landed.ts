import type { reportLanded } from "@antumbra/domain-reports/facts/report-landed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { outcomeId } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { pieceReportId } from "@antumbra/platform-vocabulary/reports.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const reportLandedMaterializer = Effect.fn("reports.ReportLanded")(function* (
	fact: FactValue<typeof reportLanded>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.report.insertVoid(fact).pipe(Effect.orDie);
	yield* rows.pieceReport.insertVoid({ id: pieceReportId(fact.pieceId, fact.id), pieceId: fact.pieceId, reportId: fact.id }).pipe(Effect.orDie);
	yield* rows.pieceOutcome
		.insertVoid({
			id: outcomeId("report", fact.id, fact.pieceId),
			pieceId: fact.pieceId,
			sourceKind: "report",
			sourceId: fact.id,
			status: "landed",
		})
		.pipe(Effect.orDie);
});
