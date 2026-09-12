import type { smoothingAttempt } from "@antumbra/domain-boards/smoothing/attempt.ts";
import { dueSmoothing } from "@antumbra/domain-boards/smoothing/due.ts";
import { finishSmoothing } from "@antumbra/domain-boards/smoothing/finished.ts";
import { requestSmoothing } from "@antumbra/domain-boards/smoothing/requested.ts";
import { localDay } from "@antumbra/domain-boards/smoothing/span.ts";
import { pendingSmoothing, type SmoothingTarget, smoothingTargets } from "@antumbra/domain-boards/smoothing/targets.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import * as Reconcile from "@antumbra/server-journal/reconcile.ts";
import { Clock, Effect } from "effect";
import { type PreparedSmoother, runSmoothingSession } from "#smoothing/session.ts";

type Attempt = typeof smoothingAttempt.Row.Type;
export type PrepareSmoother<R> = (attempt: Attempt, target: typeof SmoothingTarget.Type) => Effect.Effect<PreparedSmoother<R>, string, R>;

const failure = {
	empty: "the smoother wrote an empty summary",
	silent: "the smoother wrote no summary",
	timedOut: "the smoother did not answer in time",
} as const;

export const smoothAttempt = Effect.fn("Smoothing.attempt")(function* <R>(attempt: Attempt, prepare: PrepareSmoother<R>) {
	const live = yield* Live;
	const commit = yield* Commit;
	const work = Effect.gen(function* () {
		while (true) {
			const targets = yield* live.read(smoothingTargets, { id: attempt.id, now: new Date(yield* Clock.currentTimeMillis).toISOString() });
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
	yield* commit.commit(finishSmoothing, { id: attempt.id, status, detail, requestId: Request.make(`${attempt.id}:finished`) }).pipe(
		Effect.catchTag("AlreadyDone", () => Effect.void),
		Effect.orDie,
	);
});

export const smoothing = Effect.fn("Smoothing.run")(function* <R>(prepare: PrepareSmoother<R>) {
	const commit = yield* Commit;
	const pending = yield* Reconcile.run(pendingSmoothing, {}, (attempts) =>
		Effect.forEach(attempts, (attempt) => smoothAttempt(attempt, prepare), { discard: true }),
	);
	const daily = Effect.forever(
		Effect.scoped(
			Effect.gen(function* () {
				const now = new Date(yield* Clock.currentTimeMillis);
				const due = yield* Reconcile.run(dueSmoothing, { now: now.toISOString() }, (demands) =>
					Effect.forEach(
						demands,
						(demand) => {
							const key = demand.pieceId === null ? ["smoothing-day", demand.voyageId, localDay(now)] : ["smoothing-piece", demand.pieceId];
							return commit.commit(requestSmoothing, { ...demand, requestId: Request.make(JSON.stringify(key)) }).pipe(
								Effect.catchTag("AlreadyDone", () => Effect.void),
								Effect.orDie,
							);
						},
						{ discard: true },
					),
				);
				const tomorrow = new Date(now);
				tomorrow.setHours(24, 0, 0, 0);
				yield* Effect.raceAllFirst([due.await, Effect.sleep(tomorrow.getTime() - now.getTime())]);
			}),
		),
	);
	yield* Effect.all([pending.await, daily], { concurrency: "unbounded", discard: true });
});
