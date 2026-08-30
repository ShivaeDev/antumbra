import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Cause, Data, Deferred, Effect, Fiber, Option, Ref, Schema, Stream } from "effect";
import type { IntentStatus } from "#fsm.ts";
import { maxConcurrency } from "#gate.ts";
import { defineIntent } from "#intent.ts";
import { Kernel } from "#kernel.ts";
import { acquireTemporaryPersistence, kernelLayer, statusesUntilTerminal } from "#test/harness.ts";
import { IntentExecution } from "#workflow.ts";

const EMPTY = Schema.Struct({});

const untilWaiting = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => status === "waiting"),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const untilWaitOrFailure = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => status === "waiting" || status === "failed"),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const waitFirstAttempt = (attempts: Ref.Ref<number>) =>
	IntentExecution.use((execution) =>
		Effect.gen(function* () {
			const attempt = yield* Ref.updateAndGet(attempts, (count) => count + 1);
			if (attempt === 1) {
				return yield* execution.wait("credentials are locked");
			}
		}),
	);

it.live("a waiting intent frees capacity and retries under the same id", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const attempts = yield* Ref.make(0);
		const waiting = defineIntent({
			execute: () => waitFirstAttempt(attempts),
			payload: EMPTY,
			tag: "test/waiting",
		});
		const quick = defineIntent({
			execute: () => Effect.void,
			payload: EMPTY,
			tag: "test/quick",
		});
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const first = yield* kernel.submit(waiting, {});
			expect(yield* untilWaiting(first.changes)).toBe("waiting");
			const row = Option.getOrThrow(yield* db.Intent.where({ id: first.id }).first());
			expect(row.detail).toContain("credentials are locked");
			const second = yield* kernel.submit(quick, {});
			expect((yield* statusesUntilTerminal(second.changes)).at(-1)).toBe("succeeded");
			yield* kernel.retry(first.id);
			expect((yield* statusesUntilTerminal(kernel.changes(first.id))).at(-1)).toBe("succeeded");
			expect(yield* Ref.get(attempts)).toBe(2);
		}).pipe(
			Effect.provide(
				kernelLayer(temporary, {
					gates: [maxConcurrency(1)],
					kinds: [waiting, quick],
				}),
			),
		);
	}),
);

it.live("waiting survives restart until explicit retry", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const attempts = yield* Ref.make(0);
		const firstKind = defineIntent({
			execute: () => waitFirstAttempt(attempts),
			payload: EMPTY,
			tag: "test/waiting-restart",
		});
		const id = yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(firstKind, {});
			yield* untilWaiting(submission.changes);
			return submission.id;
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [firstKind] })));
		const resumedKind = defineIntent({
			execute: () => Ref.update(attempts, (count) => count + 1),
			payload: EMPTY,
			tag: "test/waiting-restart",
		});
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const row = Option.getOrThrow(yield* db.Intent.where({ id }).first());
			expect(row.status).toBe("waiting");
			expect(yield* Ref.get(attempts)).toBe(1);
			yield* kernel.retry(id);
			expect((yield* statusesUntilTerminal(kernel.changes(id))).at(-1)).toBe("succeeded");
			expect(yield* Ref.get(attempts)).toBe(2);
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [resumedKind] })));
	}),
);

it.live("cancels a waiting intent without admitting it again", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const attempts = yield* Ref.make(0);
		const kind = defineIntent({
			execute: () =>
				IntentExecution.use((execution) => Ref.update(attempts, (count) => count + 1).pipe(Effect.andThen(execution.wait("wait for credentials")))),
			payload: EMPTY,
			tag: "test/cancel-waiting",
		});
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(kind, {});
			expect(yield* untilWaiting(submission.changes)).toBe("waiting");
			yield* kernel.cancel(submission.id);
			expect((yield* statusesUntilTerminal(kernel.changes(submission.id))).at(-1)).toBe("cancelled");
			expect(yield* Ref.get(attempts)).toBe(1);
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [kind] })));
	}),
);

it.live("cancellation wins when an interrupt finalizer also waits", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const started = yield* Deferred.make<void>();
		const never = yield* Deferred.make<void>();
		const kind = defineIntent({
			execute: () =>
				IntentExecution.use((execution) =>
					Deferred.succeed(started, undefined).pipe(
						Effect.andThen(Deferred.await(never)),
						Effect.onInterrupt(() => execution.wait("late wait")),
					),
				),
			payload: EMPTY,
			tag: "test/cancel-wait-race",
		});
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(kind, {});
			const observed = yield* Effect.forkChild(statusesUntilTerminal(submission.changes));
			yield* Deferred.await(started);
			yield* kernel.cancel(submission.id);
			const statuses = yield* Fiber.join(observed);
			expect(statuses).toContain("cancelling");
			expect(statuses.at(-1)).toBe("cancelled");
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [kind] })));
	}),
);

class SecondFailure extends Data.TaggedError("SecondFailure")<{
	readonly detail: string;
}> {}

const waitWith = (extra: Cause.Cause<unknown>) =>
	IntentExecution.use((execution) =>
		execution.wait("credentials are locked").pipe(Effect.catchCause((cause) => Effect.failCause(Cause.combine(cause, extra)))),
	);

const expectMixedWaitToFail = (tag: string, extra: Cause.Cause<unknown>, evidence: string) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const kind = defineIntent({
			execute: () => waitWith(extra),
			payload: EMPTY,
			tag,
		});
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(kind, {});
			expect(yield* untilWaitOrFailure(submission.changes)).toBe("failed");
			const row = Option.getOrThrow(yield* db.Intent.where({ id: submission.id }).first());
			expect(row.detail).toContain(evidence);
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [kind] })));
	});

it.live("does not hide a defect mixed with a wait signal", () =>
	expectMixedWaitToFail("test/wait-defect", Cause.die("cleanup defect"), "cleanup defect"),
);

it.live("does not hide another failure mixed with a wait signal", () =>
	expectMixedWaitToFail("test/wait-failure", Cause.fail(new SecondFailure({ detail: "cleanup failed" })), "SecondFailure"),
);
