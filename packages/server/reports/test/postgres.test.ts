import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { chartering, hasChartedReef, opening, reef, soundings } from "@antumbra/app-testing/postgres-fixtures.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import { ReportId } from "@antumbra/platform-vocabulary/reports-ids.ts";
import { Effect } from "effect";
import { expect } from "vitest";

const landing = { pieceId: soundings, authorAgentId: null, title: "Soundings", body: "Three fathoms", requestId: Request.make("report") };

postgresApp.it(
	"replays report text and links and accepts another report after seeding",
	[],
	function* ({ api, journal, replayJournal, published, clearPublished, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.voyages.open(opening);
		yield* legacy.api.pieces.charter(chartering);
		yield* legacy.api.reports.land(landing);
		yield* replayJournal(legacy);
		const id = ReportId.make("report");
		expect(yield* api["reports.byId"]({ id })).toEqual(yield* answered(legacy.api.reports.byId({ id }), "report"));
		expect(yield* api["reports.forVoyage"]({ id, voyageId: reef })).toMatchObject({ body: "Three fathoms", pieceIds: [soundings] });
		const watched = yield* legacy.watchKeys([
			"report",
			"pieceReport",
			`pieceReport:${soundings}`,
			"pieceOutcome",
			`pieceOutcome:${soundings}`,
			"pieceProgress",
			`pieceProgress:${reef}`,
			"voyagePieceProgress",
			`voyagePieceProgress:${reef}`,
			"voyageProgress",
		]);
		yield* clearPublished();
		const another = { ...landing, requestId: Request.make("another"), title: "More soundings" };
		yield* api["reports.land"](another);
		yield* legacy.api.reports.land(another);
		expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
		const reports = yield* api["reports.byPiece"]({ pieceId: soundings });
		expect(reports).toEqual(yield* answered(legacy.api.reports.byPiece({ pieceId: soundings }), "reports"));
		yield* rebuild();
		expect(yield* api["reports.byPiece"]({ pieceId: soundings })).toEqual(reports);
		yield* clearPublished();
		expect(
			yield* Effect.flip(api["reports.land"]({ ...landing, pieceId: PieceId.make("missing"), requestId: Request.make("rejected") })),
		).toMatchObject({ _tag: "PieceNotFound" });
		expect(yield* api["reports.byPiece"]({ pieceId: soundings })).toEqual(reports);
		expect(yield* published()).toEqual([]);
	},
);

postgresApp.it(
	"keeps a rolled-back report and its outcome out of public readings",
	[hasChartedReef],
	function* ({ api, reportsHistory, rollback, published, clearPublished }) {
		yield* clearPublished();
		yield* rollback(
			reportsHistory.append(Request.make("rollback"), [
				{
					_tag: "ReportLanded",
					id: ReportId.make("rollback"),
					pieceId: soundings,
					authorAgentId: null,
					title: "Lost",
					body: "Not committed",
					createdAt: "1970-01-01T00:00:00.000Z",
					at: 0,
				},
			]),
		);
		expect(yield* api["reports.byPiece"]({ pieceId: soundings })).toEqual([]);
		expect(yield* published()).toEqual([]);
	},
);
