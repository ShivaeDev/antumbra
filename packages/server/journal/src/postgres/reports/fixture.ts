import { ReportsEvent } from "@antumbra/platform-vocabulary/reports-event.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { legacyEvents, legacyRows } from "#postgres/legacy.ts";
import { reset } from "#postgres/reports/projection.ts";
import { pieceReport, report } from "#postgres/reports/rows.ts";
import { ReportsHistory } from "#postgres/reports/service.ts";
export const journalReports = Effect.fn("ReportsFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	const events = yield* legacyEvents(ReportsEvent, ["ReportLanded"]).pipe(Effect.provideService(SqlClient.SqlClient, source));
	return {
		events,
		report: yield* legacyRows(report).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		pieceReport: yield* legacyRows(pieceReport).pipe(Effect.provideService(SqlClient.SqlClient, source)),
	};
});
export const replayReportsFixture = Effect.fn("ReportsFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalReports>>) {
	const history = yield* ReportsHistory;
	yield* reset;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	yield* history.rebuild();
	const rows = yield* history.rows();
	if (
		!(
			Schema.toEquivalence(Schema.Array(report.Row))(snapshot.report, yield* rows.report.where({})) &&
			Schema.toEquivalence(Schema.Array(pieceReport.Row))(snapshot.pieceReport, yield* rows.pieceReport.where({}))
		)
	)
		return yield* Effect.fail(new ReportsFixtureMismatch({ message: "Reports history does not reproduce captured rows" }));
	return { reports: snapshot.events.length, events: snapshot.events.length };
});
export class ReportsFixtureMismatch extends Schema.TaggedError<ReportsFixtureMismatch>()("ReportsFixtureMismatch", { message: Schema.String }) {}
