import { answered, it } from "@antumbra/app-testing/entry.ts";
import { FLAGSHIP_REQUEST, VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Clock } from "effect";
import { expect } from "vitest";
import { localDay } from "#queries/smoothing-span.ts";
import { smoothingState } from "#queries/smoothing-state.ts";
import { chartering, noting, opening, reef, soundings, soundingsBoard } from "#test/kit.ts";

it.app("a failed voyage pass still counts today and becomes due on the next local day", function* (app) {
	yield* app.api.voyages.open(opening);
	const now = new Date(yield* Clock.currentTimeMillis);
	const flagshipPass = { voyageId: VoyageId.make(FLAGSHIP_REQUEST), pieceId: null, throughToday: false };
	expect(yield* answered(app.api.boards.dueSmoothing({ now: now.toISOString() }))).toEqual([
		flagshipPass,
		{ voyageId: reef, pieceId: null, throughToday: false },
	]);
	yield* app.api.boards.requestSmoothing({ voyageId: reef, pieceId: null, throughToday: false, requestId: Id.Request.make("pass-today") });
	yield* app.api.boards.finishSmoothing({ id: "pass-today", status: "failed", detail: "the smoother wrote no summary" });
	expect(yield* answered(app.api.boards.dueSmoothing({ now: now.toISOString() }))).toEqual([flagshipPass]);
	now.setDate(now.getDate() + 1);
	expect(yield* answered(app.api.boards.dueSmoothing({ now: now.toISOString() }))).toEqual([
		flagshipPass,
		{ voyageId: reef, pieceId: null, throughToday: false },
	]);
});

it.app("a concluded piece with uncovered notes is attempted once even when that pass fails", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.boards.write(noting("shoal", "the shoal shelves fast", soundingsBoard));
	const now = new Date(yield* Clock.currentTimeMillis).toISOString();
	expect((yield* answered(app.api.boards.dueSmoothing({ now }))).some((demand) => demand.pieceId === soundings)).toBe(false);
	yield* app.api.pieces.landVerdict({ id: soundings, verdict: "delivered" });
	expect((yield* answered(app.api.boards.dueSmoothing({ now }))).some((demand) => demand.pieceId === soundings)).toBe(true);
	yield* app.api.boards.requestSmoothing({ voyageId: reef, pieceId: soundings, throughToday: false, requestId: Id.Request.make("pass-piece") });
	yield* app.api.boards.finishSmoothing({ id: "pass-piece", status: "failed", detail: "the smoother did not answer in time" });
	expect((yield* answered(app.api.boards.dueSmoothing({ now }))).some((demand) => demand.pieceId === soundings)).toBe(false);
});

it.app("a manual voyage pass includes concluded pieces then today's uncovered voyage notes", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.pieces.landVerdict({ id: soundings, verdict: "delivered" });
	yield* app.api.boards.write(noting("shoal", "piece detail", soundingsBoard));
	yield* app.api.boards.write(noting("tide", "voyage detail"));
	const now = new Date(yield* Clock.currentTimeMillis);
	yield* app.api.boards.requestSmoothing({ voyageId: reef, pieceId: null, throughToday: false, requestId: Id.Request.make("automatic") });
	expect(yield* answered(app.api.boards.smoothingTargets({ id: "automatic", now: now.toISOString() }))).toMatchObject([
		{ pieceId: soundings, level: "piece", entries: [{ body: "piece detail" }] },
	]);
	yield* app.api.boards.requestSmoothing({ voyageId: reef, pieceId: null, throughToday: true, requestId: Id.Request.make("manual") });
	expect(yield* answered(app.api.boards.smoothingTargets({ id: "manual", now: now.toISOString() }))).toMatchObject([
		{ pieceId: soundings, level: "piece", coversFrom: 1, coversTo: 1 },
		{ pieceId: null, level: "day", title: localDay(now), entries: [{ body: "voyage detail" }] },
	]);
});

it.app("updates the smoothing reading when a voyage board receives another rough note", function* (app) {
	yield* app.api.voyages.open(opening);
	const reading = yield* app.live(smoothingState, { voyageId: reef });
	yield* app.settle();
	expect((yield* reading.seen).at(-1)).toEqual({ state: "idle", uncovered: 0 });
	yield* app.api.boards.write(noting("new-note", "The wind has backed"));
	yield* app.settle();
	expect((yield* reading.seen).at(-1)).toEqual({ state: "idle", uncovered: 1 });
});
