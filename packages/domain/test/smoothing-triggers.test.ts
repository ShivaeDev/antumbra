import { BoardScope, Boards } from "@antumbra/boards";
import { VoyageSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { callTool, completesTurn } from "#test/harness.ts";
import { laterBy } from "#test/session-idle-fixture.ts";
import {
	DAY_MILLIS,
	dailyPass,
	finishedPiece,
	landed,
	noteOn,
	passedADayLater,
	piecePass,
	reefWithHand,
	smootherAtWork,
	smoothIntents,
	soundings,
} from "#test/smoothing-fixture.ts";
import { terminalIntent } from "#test/voyage-fixtures.ts";

const PIECE_SUMMARY = "The northern shoals were sounded; the eastern channel is still unmeasured.";

const DAY_SUMMARY = "The reef was worked over and the shoal reported.";

it.effectApp("a finished Piece is smoothed onto its own board and again onto the Voyage's", function* ({ scripted }) {
	const boards = yield* Boards;
	const voyage = yield* reefWithHand;
	const piece = yield* finishedPiece(voyage.id);

	yield* piecePass;
	const [intent] = yield* smoothIntents("board/smooth-piece", piece.id);
	const pass = yield* smootherAtWork(scripted);
	expect(pass.material).toContain("soundings");
	expect(pass.material).toContain("the northern shoal is steeper than charted");
	yield* callTool(pass.session, "write_summary", { text: PIECE_SUMMARY });
	expect(yield* terminalIntent(intent?.id ?? "")).toBe("succeeded");

	expect(yield* boards.read(BoardScope.Piece({ pieceId: piece.id }))).toMatchObject([
		{ kind: "note", register: "rough", seq: 1 },
		{ body: PIECE_SUMMARY, coversFrom: 1, coversTo: 1, kind: "summary", level: "piece", register: "smooth", seq: 2 },
	]);
	expect(yield* boards.read(BoardScope.Voyage({ voyageId: voyage.id }))).toMatchObject([
		{ body: PIECE_SUMMARY, kind: "pieceSummary", register: "rough", sourceRef: piece.id },
	]);
	expect(yield* boards.uncovered(BoardScope.Piece({ pieceId: piece.id }))).toEqual([]);
});

it.effectApp("a finished Piece whose board is empty is never passed and writes nothing", function* ({ scripted }) {
	const boards = yield* Boards;
	const db = yield* Database;
	const voyage = yield* reefWithHand;
	yield* landed((yield* soundings(voyage.id)).id);

	yield* piecePass;

	expect(yield* smoothIntents("board/smooth-piece", voyage.id)).toEqual([]);
	expect(yield* scripted.opened).toEqual([]);
	expect(yield* boards.read(BoardScope.Voyage({ voyageId: voyage.id }))).toEqual([]);
	expect(yield* db.VoyageAgent.where({ role: "smoother" }).count()).toBe(0);
});

it.effectApp("a Voyage pass settles its finished Pieces before its own days", function* ({ scripted }) {
	const boards = yield* Boards;
	const source = yield* VoyageSource;
	const voyage = yield* reefWithHand;
	const piece = yield* finishedPiece(voyage.id);
	yield* noteOn(BoardScope.Voyage({ voyageId: voyage.id }), "the channel buoy is adrift");

	yield* source.smoothBoard(voyage.id);
	const first = yield* smootherAtWork(scripted);
	expect(first.material).toContain("the northern shoal is steeper than charted");
	yield* callTool(first.session, "write_summary", { text: PIECE_SUMMARY });
	const second = yield* smootherAtWork(scripted);
	expect(second.material).toContain("the channel buoy is adrift");
	expect(second.material).toContain(PIECE_SUMMARY);
	yield* callTool(second.session, "write_summary", { text: DAY_SUMMARY });
	const [intent] = yield* smoothIntents("board/smooth", voyage.id);
	expect(yield* terminalIntent(intent?.id ?? "")).toBe("succeeded");

	expect((yield* boards.read(BoardScope.Voyage({ voyageId: voyage.id }))).map((entry) => entry.kind)).toEqual(["note", "pieceSummary", "summary"]);
	expect(yield* boards.uncovered(BoardScope.Piece({ pieceId: piece.id }))).toEqual([]);
});

it.effectApp("the daily pass smooths the days that closed and leaves the day under way", function* ({ scripted }) {
	const boards = yield* Boards;
	const voyage = yield* reefWithHand;
	const scope = BoardScope.Voyage({ voyageId: voyage.id });
	yield* laterBy(-DAY_MILLIS, noteOn(scope, "the reef shifts after a storm"));
	yield* noteOn(scope, "the channel buoy is adrift");

	yield* dailyPass;
	const [intent] = yield* smoothIntents("board/smooth", voyage.id);
	expect(intent?.payload).toContain('"throughToday":false');
	const pass = yield* smootherAtWork(scripted);
	expect(pass.material).toContain("the reef shifts after a storm");
	expect(pass.material).not.toContain("the channel buoy is adrift");
	yield* callTool(pass.session, "write_summary", { text: DAY_SUMMARY });
	expect(yield* terminalIntent(intent?.id ?? "")).toBe("succeeded");

	expect((yield* boards.uncovered(scope)).flatMap((day) => day.entries.map((entry) => entry.body))).toEqual(["the channel buoy is adrift"]);
});

it.effectApp("a Voyage is passed once a local day, and again once the day has turned", function* () {
	const voyage = yield* reefWithHand;

	yield* dailyPass;
	const [first] = yield* smoothIntents("board/smooth", voyage.id);
	expect(yield* terminalIntent(first?.id ?? "")).toBe("succeeded");
	yield* dailyPass;
	expect(yield* smoothIntents("board/smooth", voyage.id)).toHaveLength(1);
	yield* passedADayLater;

	expect(yield* smoothIntents("board/smooth", voyage.id)).toHaveLength(2);
});

it.effectApp("a Piece pass that writes nothing is asked again by the next Voyage pass and never by itself", function* ({ scripted }) {
	const boards = yield* Boards;
	const source = yield* VoyageSource;
	const voyage = yield* reefWithHand;
	const piece = yield* finishedPiece(voyage.id);

	yield* piecePass;
	const [attempt] = yield* smoothIntents("board/smooth-piece", piece.id);
	yield* completesTurn((yield* smootherAtWork(scripted)).session);
	expect(yield* terminalIntent(attempt?.id ?? "")).toBe("failed");
	yield* piecePass;
	expect(yield* smoothIntents("board/smooth-piece", piece.id)).toHaveLength(1);
	expect((yield* boards.uncovered(BoardScope.Piece({ pieceId: piece.id }))).flatMap((day) => day.entries)).toHaveLength(1);

	yield* source.smoothBoard(voyage.id);
	const retry = yield* smootherAtWork(scripted);
	expect(retry.material).toContain("the northern shoal is steeper than charted");
	yield* callTool(retry.session, "write_summary", { text: PIECE_SUMMARY });
	yield* callTool((yield* smootherAtWork(scripted)).session, "write_summary", { text: DAY_SUMMARY });
	const [pass] = yield* smoothIntents("board/smooth", voyage.id);
	expect(yield* terminalIntent(pass?.id ?? "")).toBe("succeeded");

	expect(yield* boards.uncovered(BoardScope.Piece({ pieceId: piece.id }))).toEqual([]);
	expect(yield* boards.read(BoardScope.Voyage({ voyageId: voyage.id }))).toMatchObject([
		{ body: PIECE_SUMMARY, kind: "pieceSummary", register: "rough", sourceRef: piece.id },
		{ body: DAY_SUMMARY, kind: "summary", level: "day", register: "smooth" },
	]);
});
