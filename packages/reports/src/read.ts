import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import type { ReportReading } from "#model.ts";

export const readReport = Effect.fn("reports.readReport")(function* (reportId: string) {
	const db = yield* Database;
	const stored = yield* db.Report.where({ id: reportId }).first();
	if (Option.isNone(stored)) {
		return Option.none<ReportReading>();
	}
	const row = stored.value;
	const links = yield* db.PieceReport.where({ reportId }).all();
	return Option.some<ReportReading>({
		authorAgentId: row.authorAgentId,
		body: row.body,
		id: row.id,
		pieceIds: links.map((link) => link.pieceId),
		title: row.title,
	});
});
