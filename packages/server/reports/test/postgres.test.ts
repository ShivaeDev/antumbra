import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { hasChartedReef, soundings } from "@antumbra/app-testing/postgres-fixtures.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { ReportId } from "@antumbra/platform-vocabulary/reports-ids.ts";
import { expect } from "vitest";

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
		expect(yield* answered(api["reports.byPiece"]({ pieceId: soundings }), "reports.byPiece")).toEqual([]);
		expect(yield* published()).toEqual([]);
	},
);
