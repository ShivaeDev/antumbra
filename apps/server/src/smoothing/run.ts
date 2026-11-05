import { dueSmoothing } from "@antumbra/domain-boards/queries/due-smoothing.ts";
import { localDay } from "@antumbra/domain-boards/queries/smoothing-span.ts";
import { pendingSmoothing, type SmoothingTarget } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import type { smoothingAttempt } from "@antumbra/domain-boards/rows/smoothing-attempt.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Boards } from "@antumbra/server-boards/service.ts";
import { each } from "@shivaedev/reconciler/each.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Clock, Effect, Fiber, Semaphore } from "effect";
import { type PreparedSmoother, runSmoothingSession } from "#smoothing/session.ts";
import { watchKeys } from "#supervision/keys.ts";

type Attempt = typeof smoothingAttempt.Row.Type;
export type PrepareSmoother<R> = (attempt: Attempt, target: typeof SmoothingTarget.Type) => Effect.Effect<PreparedSmoother<R>, string, R>;

const failure = {
	empty: "the smoother wrote an empty summary",
	silent: "the smoother wrote no summary",
	timedOut: "the smoother did not answer in time",
} as const;

export const smoothAttempt = Effect.fn("Smoothing.attempt")(function* <R>(attempt: Attempt, prepare: PrepareSmoother<R>) {
	const boardsService = yield* Boards;

	const work = Effect.gen(function* () {
		const boardsService = yield* Boards;

		while (true) {
			const targets = yield* boardsService
				.smoothingTargets({ id: attempt.id, now: new Date(yield* Clock.currentTimeMillis).toISOString() })
				.pipe(Effect.orDie);
			const target = targets[0];
			if (target === undefined) return;
			const prepared = yield* prepare(attempt, target);
			const outcome = yield* runSmoothingSession(attempt.id, target, prepared);
			if (outcome !== "written") return yield* Effect.fail(failure[outcome]);
		}
	});
	const result = yield* Effect.result(work);
	const status = result._tag === "Success" ? "succeeded" : "failed";
	const detail = result._tag === "Success" ? null : String(result.failure);
	yield* boardsService.finishSmoothing({ id: attempt.id, status, detail, requestId: Request.make(`${attempt.id}:finished`) }).pipe(
		Effect.catchTag("AlreadyDone", () => Effect.void),
		Effect.orDie,
	);
});

const requestDue = Effect.fn("Smoothing.requestDue")(function* (now: Date, demands: typeof dueSmoothing.output.Type) {
	const boardsService = yield* Boards;

	for (const demand of demands) {
		const key = demand.pieceId === null ? ["smoothing-day", demand.voyageId, localDay(now)] : ["smoothing-piece", demand.pieceId];
		yield* boardsService.requestSmoothing({ ...demand, requestId: Request.make(JSON.stringify(key)) }).pipe(
			Effect.catchTag("AlreadyDone", () => Effect.void),
			Effect.orDie,
		);
	}
});

const watchDay = Effect.fn("Smoothing.watchDay")(function* () {
	const boardsService = yield* Boards;

	const now = new Date(yield* Clock.currentTimeMillis);
	const due = yield* run({
		keys: watchKeys(dueSmoothing.reads, dueSmoothing.scope?.({ now: now.toISOString() })),
		read: boardsService.dueSmoothing({ now: now.toISOString() }).pipe(Effect.orDie),
		act: (demands) => requestDue(now, demands),
	});
	const tomorrow = new Date(now);
	tomorrow.setHours(24, 0, 0, 0);
	yield* Effect.raceAllFirst([due.await, Effect.sleep(tomorrow.getTime() - now.getTime())]);
});

export const smoothing = Effect.fn("Smoothing.run")(function* <R>(prepare: PrepareSmoother<R>) {
	const boardsService = yield* Boards;

	const serial = yield* Semaphore.make(1);
	const pending = yield* each({
		keys: watchKeys(pendingSmoothing.reads, pendingSmoothing.scope?.({})),
		read: boardsService
			.pendingSmoothing({})
			.pipe(Effect.orDie)
			.pipe(Effect.map((attempts) => attempts.filter((attempt) => !attempt.held))),
		key: (attempt) => attempt.id,
		act: (attempt) => smoothAttempt(attempt, prepare).pipe(serial.withPermit),
	});
	const day = yield* Effect.forkScoped(Effect.forever(Effect.scoped(watchDay())));
	return { refresh: pending.refresh, await: Effect.raceAllFirst([pending.await, Effect.asVoid(Fiber.join(day))]) };
});
