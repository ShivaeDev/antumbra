import { ReportsEvent } from "@antumbra/platform-vocabulary/reports-event.ts";
import { selection as pieceReportSelection } from "@antumbra/server-storage/records/piece-report.ts";
import { selection as reportSelection } from "@antumbra/server-storage/records/report.ts";
import { pieceReport, report } from "@antumbra/server-storage/reports/rows.ts";
import { ReportsHistory } from "@antumbra/server-storage/reports/service.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { legacyEvents, legacyRows } from "#v1-rows.ts";
export const journalReports = Effect.fn("ReportsFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
	const events = yield* legacyEvents(ReportsEvent, ["ReportLanded"]).pipe(Effect.provideService(SqlClient.SqlClient, source));
	return {
		events,
		report: yield* legacyRows(report).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		pieceReport: yield* legacyRows(pieceReport).pipe(Effect.provideService(SqlClient.SqlClient, source)),
	};
});
export const replayReportsFixture = Effect.fn("ReportsFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalReports>>) {
	const history = yield* ReportsHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	const rows = yield* history.rows();
	if (
		!(
			Schema.toEquivalence(Schema.Array(report.Row))(
				snapshot.report,
				yield* rows.report.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: reportSelection }).pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(pieceReport.Row))(
				snapshot.pieceReport,
				yield* rows.pieceReport
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceReportSelection })
					.pipe(Effect.orDie),
			)
		)
	)
		return yield* Effect.fail(new ReportsFixtureMismatch({ message: "Reports history does not reproduce captured rows" }));
	return { reports: snapshot.events.length, events: snapshot.events.length };
});
export class ReportsFixtureMismatch extends Schema.TaggedError<ReportsFixtureMismatch>()("ReportsFixtureMismatch", { message: Schema.String }) {}
