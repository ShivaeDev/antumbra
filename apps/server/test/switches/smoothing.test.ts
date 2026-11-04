import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { smoothingRunner } from "@antumbra/app-testing/test-support/smoothing-runner.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyageBoard } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Clock } from "effect";
import { expect } from "vitest";

const PRESSED = VoyageId.make("pressed-voyage");
const DAILY = VoyageId.make("daily-voyage");

const opening = (id: VoyageId) =>
	({
		name: `Voyage ${id}`,
		northStar: "Every shoal known",
		context: "",
		kind: "voyage",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
		requestId: Request.make(id),
	}) as const;

it.app("a smoother Antumbra asks for waits on its spawn switch while one the admiral presses runs", function* (app) {
	const now = new Date(yield* Clock.currentTimeMillis).toISOString();
	for (const id of [PRESSED, DAILY]) {
		yield* app.api.voyages.open(opening(id));
		yield* eventually(
			app.api.boards.dueSmoothing({ now }),
			(demands) => !demands.some((demand) => demand.voyageId === id),
			"the initial daily smoothing request to be recorded",
		);
		yield* eventually(app.api.boards.smoothingState({ voyageId: id }), (state) => state.state === "idle", "the empty initial pass to finish");
	}
	yield* app.api.settings.setFlag({ key: "spawnSmoother", on: false });
	const runner = yield* smoothingRunner();
	for (const id of [PRESSED, DAILY]) {
		yield* app.api.boards.write({ board: voyageBoard(id), body: "The tide turned", register: "rough", author: null });
	}
	yield* app.api.boards.requestSmoothing({
		voyageId: DAILY,
		pieceId: null,
		throughToday: true,
		by: "antumbra",
		requestId: Request.make("daily-pass"),
	});
	yield* app.api.boards.requestSmoothing({
		voyageId: PRESSED,
		pieceId: null,
		throughToday: true,
		by: "admiral",
		requestId: Request.make("pressed-pass"),
	});
	yield* runner.summarizeNext("The approach changed with the tide");
	yield* eventually(
		app.api.boards.smoothingState({ voyageId: PRESSED }),
		(state) => state.state === "idle" && state.uncovered === 0,
		"the pressed voyage's smoothing to finish",
	);
	expect(yield* answered(app.api.boards.smoothingState({ voyageId: DAILY }), "the daily voyage's smoothing state to be read")).toMatchObject({
		uncovered: 1,
	});
	expect((yield* answered(app.api.holds.queues({}), "the hold queues to be listed")).queues).toMatchObject([
		{ setting: "spawnSmoother", held: true },
	]);
	yield* app.api.settings.setFlag({ key: "spawnSmoother", on: true });
	yield* runner.summarizeNext("The daily course is charted");
	yield* eventually(
		app.api.boards.smoothingState({ voyageId: DAILY }),
		(state) => state.state === "idle" && state.uncovered === 0,
		"the daily voyage's smoothing to finish",
	);
});
