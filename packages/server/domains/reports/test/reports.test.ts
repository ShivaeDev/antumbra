import { answered, it } from "@antumbra/app-testing/entry.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { ReportId } from "#ids.ts";
import { byPiece } from "#queries/by-piece.ts";
import { chartering, landing, opening, reportId, soundings } from "#test/kit.ts";

it.app("lands a report and its Piece outcome together, and pushes its reference to the live reading", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	const watched = yield* app.live(byPiece, { pieceId: soundings });
	yield* app.api.reports.land(landing);
	yield* app.settle();

	expect((yield* watched.seen).at(-1)).toMatchObject([{ id: reportId, title: landing.title, authorAgentId: landing.authorAgentId }]);
	expect(yield* answered(app.api.reports.byId({ id: reportId }))).toMatchObject({
		id: reportId,
		title: landing.title,
		body: landing.body,
		authorAgentId: landing.authorAgentId,
		pieceIds: [soundings],
	});
	expect(yield* app.rows.pieceReport.where({ pieceId: soundings })).toMatchObject([{ reportId, pieceId: soundings }]);
	expect(yield* app.rows.pieceOutcome.where({ pieceId: soundings })).toMatchObject([{ sourceKind: "report", sourceId: reportId, status: "landed" }]);
});

it.app("refuses an orphan report without leaving report, link, or outcome rows", function* (app) {
	const refusal = yield* Effect.flip(app.api.reports.land(landing));
	expect(refusal).toMatchObject({ _tag: "PieceNotFound", pieceId: soundings });
	expect(yield* app.rows.report.count({})).toBe(0);
	expect(yield* app.rows.pieceReport.count({})).toBe(0);
	expect(yield* app.rows.pieceOutcome.count({})).toBe(0);
	expect(yield* answered(app.api.reports.byId({ id: reportId }))).toBeNull();
});

it.app("keeps report contents unchanged and lists only the requested Piece's reports", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.reports.land({ ...landing, authorAgentId: null, body: "", title: "  " });
	expect(yield* answered(app.api.reports.byId({ id: reportId }))).toMatchObject({ authorAgentId: null, body: "", title: "  " });
	expect(yield* answered(app.api.reports.byPiece({ pieceId: PieceId.make("other") }))).toEqual([]);
	expect(yield* answered(app.api.reports.byId({ id: ReportId.make("unknown") }))).toBeNull();
});
