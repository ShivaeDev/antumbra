import { answered, it } from "@antumbra/app-testing/entry.ts";
import { voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { pendingSmoothing, smoothingTargets } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Clock, Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { expect } from "vitest";
import { smoothAttempt } from "#smoothing/run.ts";
import { runSmoothingSession } from "#smoothing/session.ts";
import { writeSummaryTool } from "#tools/boards/summary.ts";

const voyageId = VoyageId.make("runtime-voyage");
const opening = {
	name: "Runtime voyage",
	northStar: "Every shoal known",
	context: "",
	kind: "voyage",
	captainBackend: null,
	captainModel: null,
	captainEffort: null,
	crewBackend: null,
	crewModel: null,
	crewEffort: null,
	requestId: Request.make(voyageId),
} as const;

it.app("runs a constrained summary pass through its bound domain tool and closes the session", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.boards.write({ board: voyageBoard(voyageId), body: "The tide turned", register: "rough", author: null });
	yield* app.api.boards.requestSmoothing({ voyageId, pieceId: null, throughToday: true, requestId: Request.make("runtime-pass") });
	const live = yield* Live;
	const attempt = (yield* live.read(pendingSmoothing, {})).find((pending) => pending.id === "runtime-pass");
	if (attempt === undefined) return yield* Effect.die("request was not recorded");
	let stopped = false;
	yield* smoothAttempt(attempt, () =>
		Effect.succeed({
			agentId: "smoother",
			sessionId: "smooth-session",
			start: writeSummaryTool
				.invoke({ agentId: "smoother", sessionId: "smooth-session", callId: "summary-call" }, { text: "The approach changed with the tide" })
				.pipe(Effect.asVoid),
			stop: Effect.sync(() => {
				stopped = true;
			}),
		}),
	);
	expect(stopped).toBe(true);
	expect(yield* answered(app.api.boards.smoothingState({ voyageId }))).toEqual({ state: "idle", uncovered: 0 });
	expect(yield* answered(app.api.boards.digest({ board: voyageBoard(voyageId) }))).toMatchObject([
		{ kind: "summary", body: "The approach changed with the tide" },
	]);
});

it.app("records an empty answer as a failed pass and leaves source notes standing", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.boards.write({ board: voyageBoard(voyageId), body: "The tide turned", register: "rough", author: null });
	yield* app.api.boards.requestSmoothing({ voyageId, pieceId: null, throughToday: true, requestId: Request.make("empty-pass") });
	const attempt = (yield* (yield* Live).read(pendingSmoothing, {})).find((pending) => pending.id === "empty-pass");
	if (attempt === undefined) return yield* Effect.die("request was not recorded");
	yield* smoothAttempt(attempt, () =>
		Effect.succeed({
			agentId: "smoother",
			sessionId: "empty-session",
			start: writeSummaryTool.invoke({ agentId: "smoother", sessionId: "empty-session", callId: "empty-call" }, { text: " " }).pipe(Effect.asVoid),
			stop: Effect.void,
		}),
	);
	expect(yield* answered(app.api.boards.smoothingState({ voyageId }))).toEqual({ state: "failed", uncovered: 1 });
});

it.app("stops a silent smoother after the existing ten-minute patience", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.boards.write({ board: voyageBoard(voyageId), body: "The tide turned", register: "rough", author: null });
	yield* app.api.boards.requestSmoothing({ voyageId, pieceId: null, throughToday: true, requestId: Request.make("timeout-pass") });
	const target = (yield* (yield* Live).read(smoothingTargets, {
		id: "timeout-pass",
		now: new Date(yield* Clock.currentTimeMillis).toISOString(),
	}))[0];
	if (target === undefined) return yield* Effect.die("summary target was not found");
	const started = yield* Deferred.make<void>();
	let stopped = false;
	const run = yield* Effect.forkChild(
		runSmoothingSession("timeout-pass", target, {
			agentId: "smoother",
			sessionId: "timeout-session",
			start: Deferred.succeed(started, undefined).pipe(Effect.asVoid),
			stop: Effect.sync(() => {
				stopped = true;
			}),
		}),
	);
	yield* Deferred.await(started);
	yield* TestClock.adjust(600_000);
	expect(yield* Fiber.join(run)).toBe("timedOut");
	expect(stopped).toBe(true);
});
