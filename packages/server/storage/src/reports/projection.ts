import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { outcomeId } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { pieceReportId } from "@antumbra/platform-vocabulary/reports.ts";
import type { ReportsEvent } from "@antumbra/platform-vocabulary/reports-event.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import type { rows } from "#reports/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const apply = (rows: Rows) =>
	Effect.fn("ReportsHistory.apply")(function* ({ value, requestId, streamVersion }: Event<typeof ReportsEvent.Type>) {
		switch (value._tag) {
			case "ReportLanded": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

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
				break;
			}
		}
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from "report"`;
	yield* sql`delete from "pieceReport"`;
	yield* sql`delete from "pieceOutcome" where "sourceKind" = 'report'`;
	yield* invalidateOnCommit(["report", "pieceReport"]);
});
