import { Database } from "@antumbra/persistence";
import { Repos } from "@antumbra/repos";
import { Voyages } from "@antumbra/voyages";
import { Effect, Option } from "effect";
import type { VoyageDetailRows } from "#voyage/detail/rows.ts";
import { related } from "#voyage/related.ts";
import { byId } from "#voyage-row-projection.ts";

export const read = Effect.fn("VoyageDetails.read")(function* (voyageId: string) {
	const db = yield* Database;
	const repos = yield* Repos;
	const voyages = yield* Voyages;
	const stored = yield* voyages.byId(voyageId);
	if (Option.isNone(stored)) return Option.none();
	const voyage = stored.value;
	const rows = yield* related([voyageId]);
	const memberIds = new Set(rows.memberships.map((membership) => membership.pieceId));
	const reportIds = rows.pieceReports.filter((link) => memberIds.has(link.pieceId)).map((link) => link.reportId);
	const changeIds = new Set(rows.pieceChanges.filter((link) => memberIds.has(link.pieceId)).map((link) => link.changeId));
	const repoIds = rows.changes.filter((change) => changeIds.has(change.id)).map((change) => change.repoId);
	const detail = {
		...rows,
		reports: byId(yield* db.Report.where((report) => report.id.in(reportIds)).all()),
		repos: byId(yield* repos.byIds(repoIds)),
	} satisfies VoyageDetailRows;
	return Option.some({ voyage, rows: detail });
});
