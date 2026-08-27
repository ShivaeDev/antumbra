import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import {
	persistenceIt,
	rejectTestOutcomeLinks,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import { Reports, ReportsLive } from "@antumbra/reports";
import { expect } from "@effect/vitest";
import { Effect, Layer, PubSub } from "effect";

const it = persistenceIt();
const layer = ReportsLive.pipe(Layer.provideMerge(DomainFeedsLive));
const rejectedLinkPersistence = temporaryPersistence();

it.afterAll(rejectedLinkPersistence.remove);

const piece = {
	charter: "sound the shallows",
	expectation: "the soundings land",
	id: "piece-soundings",
	launchedAt: null,
	parkedAt: null,
	role: "surveyor",
	title: "Soundings",
};

it.effectDB(
	"lands a report and its piece link before publishing",
	function* (db) {
		yield* Effect.scoped(
			Effect.gen(function* () {
				const feeds = yield* DomainFeeds;
				const reports = yield* Reports;
				const notices = yield* feeds.subscribeVoyageRefresh();
				yield* db.Piece.create(piece);

				const report = yield* reports.land({
					authorAgentId: "agent-surveyor",
					body: "depths measured",
					pieceId: piece.id,
					title: "reef soundings",
				});

				expect(report).toMatchObject({
					authorAgentId: "agent-surveyor",
					body: "depths measured",
					title: "reef soundings",
				});
				expect(yield* db.Report.all()).toMatchObject([report]);
				expect(yield* db.PieceReport.all()).toEqual([
					{ pieceId: piece.id, reportId: report.id },
				]);
				expect(yield* PubSub.take(notices)).toBeUndefined();
			}),
		).pipe(Effect.provide(layer));
	},
);

it.effectDB("refuses an orphan report without publishing", function* (db) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const reports = yield* Reports;
			const notices = yield* feeds.subscribeVoyageRefresh();
			const failure = yield* Effect.flip(
				reports.land({
					body: "depths measured",
					pieceId: "missing",
					title: "orphan soundings",
				}),
			);

			expect(failure).toMatchObject({
				_tag: "PieceNotFound",
				pieceId: "missing",
			});
			expect(yield* db.Report.all()).toEqual([]);
			expect(yield* db.PieceReport.all()).toEqual([]);
			expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
		}),
	).pipe(Effect.provide(layer));
});

it.effect("rolls back a Report whose Piece link is rejected", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const db = yield* Database;
			const feeds = yield* DomainFeeds;
			const reports = yield* Reports;
			const notices = yield* feeds.subscribeVoyageRefresh();
			yield* db.Piece.create(piece);
			yield* Effect.sync(() =>
				rejectTestOutcomeLinks(rejectedLinkPersistence.database, "report"),
			);

			const failure = yield* Effect.flip(
				reports.land({
					body: "depths measured",
					pieceId: piece.id,
					title: "rejected soundings",
				}),
			);

			expect(failure._tag).toBe("PrismaError");
			expect(yield* db.Report.all()).toEqual([]);
			expect(yield* db.PieceReport.all()).toEqual([]);
			expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
		}),
	).pipe(
		Effect.provide(
			layer.pipe(Layer.provideMerge(rejectedLinkPersistence.layer)),
		),
	),
);
