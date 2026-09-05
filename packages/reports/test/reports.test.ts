import { DomainFeeds } from "@antumbra/domain-feeds";
import { Reports } from "@antumbra/reports";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, PubSub } from "effect";

const piece = {
	charter: "sound the shallows",
	expectation: "the soundings land",
	id: "piece-soundings",
	launchedAt: null,
	parkedAt: null,
	role: "surveyor",
	title: "Soundings",
};

it.effectApp("lands a report with its piece link and publishes a voyage refresh", function* ({ db }) {
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
	expect(yield* db.PieceReport.all()).toEqual([{ pieceId: piece.id, reportId: report.id }]);
	expect(yield* PubSub.take(notices)).toBeUndefined();
});

it.effectApp("refuses an orphan report without publishing", function* ({ db }) {
	const feeds = yield* DomainFeeds;
	const reports = yield* Reports;
	const notices = yield* feeds.subscribeVoyageRefresh();
	const beforeReports = yield* db.Report.all();
	const beforeLinks = yield* db.PieceReport.all();
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
	expect(yield* db.Report.all()).toEqual(beforeReports);
	expect(yield* db.PieceReport.all()).toEqual(beforeLinks);
	expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
});
