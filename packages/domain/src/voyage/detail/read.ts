import { Database } from "@antumbra/persistence";
import { Repos } from "@antumbra/repos";
import { Effect, Option } from "effect";
import { related } from "#voyage/related.ts";
import { decodeVoyage } from "#voyage/decode.ts";
import { byId } from "#voyage-row-projection.ts";
import type { VoyageDetailRows } from "#voyage/detail/rows.ts";

export const read = Effect.fn("VoyageDetails.read")(function* (voyageId: string) {
	const db = yield* Database;
	const repos = yield* Repos;
	const stored = yield* db.Voyage.where({ id: voyageId }).first();
	if (Option.isNone(stored)) return Option.none();
	const voyage = yield* decodeVoyage(stored.value);
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
