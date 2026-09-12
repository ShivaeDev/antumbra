import { answered, it } from "@antumbra/app-testing/entry.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { chartering, noting, opening, reefBoard, soundings, soundingsBoard } from "#test/kit.ts";

const SMOOTHER = "agent-smoother";

it.app("stands a summary in the digest for the entries it covers and opens onto them", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.boards.write(noting("swell", "the swell is running"));
	yield* app.api.boards.write(noting("buoy", "the channel buoy is adrift"));

	yield* app.api.boards.summarize({
		author: SMOOTHER,
		board: reefBoard,
		body: "the approach shifted through the day",
		coversFrom: 1,
		coversTo: 2,
		level: "day",
		requestId: Id.Request.make("entry:day"),
	});
	yield* app.api.boards.write(noting("wind", "the wind backed at dusk"));

	const digested = yield* answered(app.api.boards.digest({ board: reefBoard }));
	expect(digested.map((entry) => entry.body)).toEqual(["the wind backed at dusk", "the approach shifted through the day"]);
	const summary = digested[1];
	expect(summary).toMatchObject({ kind: "summary", level: "day", register: "smooth" });
	const beneath = yield* answered(app.api.boards.under({ board: reefBoard, summaryId: summary?.id ?? "" }));
	expect(beneath.map((entry) => entry.body)).toEqual(["the channel buoy is adrift", "the swell is running"]);
});

it.app("carries a settled piece's summary onto the voyage that chartered it", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.boards.write(noting("shoal", "the shoal shelves fast", soundingsBoard));

	yield* app.api.boards.summarizePiece({
		author: SMOOTHER,
		board: reefBoard,
		body: "the eastern shoal is sounded",
		pieceId: soundings,
		requestId: Id.Request.make("entry:piece"),
	});

	const carried = yield* answered(app.api.boards.entries({ board: reefBoard }));
	expect(carried).toMatchObject([{ body: "the eastern shoal is sounded", kind: "pieceSummary", pieceId: soundings, register: "rough", seq: 1 }]);
});
