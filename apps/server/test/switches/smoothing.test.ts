import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { Commit } from "@antumbra/server-journal/commit.ts";
import type { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { type PrepareSmoother, smoothing } from "#smoothing/run.ts";
import { writeSummaryTool } from "#tools/boards/summary.ts";

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

const prepare: PrepareSmoother<Commit | Live> = (attempt) => {
	const context = { agentId: `smoother-${attempt.id}`, sessionId: `session-${attempt.id}`, callId: `call-${attempt.id}` };
	return Effect.succeed({
		agentId: context.agentId,
		sessionId: context.sessionId,
		start: writeSummaryTool.invoke(context, { text: "The approach changed with the tide" }).pipe(Effect.asVoid),
		stop: Effect.void,
	});
};

it.app("a smoother Antumbra asks for waits on its spawn switch while one the admiral presses runs", function* (app) {
	for (const id of [PRESSED, DAILY]) {
		yield* app.api.voyages.open(opening(id));
		yield* app.api.boards.write({ board: voyageBoard(id), body: "The tide turned", register: "rough", author: null });
	}
	yield* app.api.settings.setFlag({ key: "spawnSmoother", on: false });
	yield* smoothing(prepare);
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
	yield* eventually(app.api.boards.smoothingState({ voyageId: PRESSED }), (state) => state.state === "idle" && state.uncovered === 0);
	expect(yield* answered(app.api.boards.smoothingState({ voyageId: DAILY }))).toMatchObject({ uncovered: 1 });
	expect((yield* answered(app.api.holds.queues({}))).queues).toMatchObject([{ setting: "spawnSmoother", held: true }]);
	yield* app.api.settings.setFlag({ key: "spawnSmoother", on: true });
	yield* eventually(app.api.boards.smoothingState({ voyageId: DAILY }), (state) => state.state === "idle" && state.uncovered === 0);
});
