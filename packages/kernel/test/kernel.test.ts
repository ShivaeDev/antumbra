import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Deferred, Effect, Option, Ref, Schema, Stream } from "effect";
import * as TestClock from "effect/testing/TestClock";
import { type Gate, gaugeCeiling, maxConcurrency, settle } from "#gate.ts";
import { defineIntent } from "#intent.ts";
import { Kernel } from "#kernel.ts";
import { KernelLive } from "#layer.ts";
import { statusesUntilTerminal } from "#test/harness.ts";

const EMPTY = Schema.Struct({});

it.effectDB("runs a submitted intent through running to succeeded", function* () {
	const started = yield* Deferred.make<void>();
	const hold = yield* Deferred.make<void>();
	const kind = defineIntent({
		execute: () => Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(hold))),
		payload: EMPTY,
		tag: "test/journey",
	});
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(kind, {});
		yield* Deferred.await(started);
		const during = yield* Stream.runHead(submission.changes);
		expect(during).toEqual(Option.some("running"));
		yield* Deferred.succeed(hold, undefined);
		const statuses = yield* statusesUntilTerminal(kernel.changes(submission.id));
		expect(statuses.at(-1)).toBe("succeeded");
	}).pipe(Effect.provide(KernelLive({ kinds: [kind] })));
});

it.effectDB("records a failing intent as failed with its cause in detail", function* (db) {
	const kind = defineIntent({
		execute: () => Effect.fail("intent exploded"),
		payload: EMPTY,
		tag: "test/explode",
	});
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(kind, {});
		const statuses = yield* statusesUntilTerminal(submission.changes);
		expect(statuses.at(-1)).toBe("failed");
		const row = yield* db.Intent.where({ id: submission.id }).first();
		const detail = Option.isSome(row) ? row.value.detail : null;
		expect(detail).toContain("intent exploded");
	}).pipe(Effect.provide(KernelLive({ kinds: [kind] })));
});

it.effectDB("cancels a queued intent before admission", function* () {
	const closed: Gate = { admits: () => false, id: "test/closed" };
	const kind = defineIntent({
		execute: () => Effect.void,
		payload: EMPTY,
		tag: "test/never-admitted",
	});
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(kind, {});
		yield* kernel.cancel(submission.id);
		const statuses = yield* statusesUntilTerminal(submission.changes);
		expect(statuses).toEqual(["cancelled"]);
	}).pipe(Effect.provide(KernelLive({ gates: [closed], kinds: [kind] })));
});

it.effectDB("interrupts a running intent on cancel", function* () {
	const started = yield* Deferred.make<void>();
	const never = yield* Deferred.make<void>();
	const kind = defineIntent({
		execute: () => Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(never))),
		payload: EMPTY,
		tag: "test/interruptible",
	});
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(kind, {});
		yield* Deferred.await(started);
		yield* kernel.cancel(submission.id);
		const statuses = yield* statusesUntilTerminal(submission.changes);
		expect(statuses.at(-1)).toBe("cancelled");
	}).pipe(Effect.provide(KernelLive({ kinds: [kind] })));
});

it.effectDB("admits at most the concurrency limit at once", function* (db) {
	const active = yield* Ref.make(0);
	const peak = yield* Ref.make(0);
	const starts = {
		a: yield* Deferred.make<void>(),
		b: yield* Deferred.make<void>(),
	};
	const holds = {
		a: yield* Deferred.make<void>(),
		b: yield* Deferred.make<void>(),
	};
	const kind = defineIntent({
		execute: (payload) =>
			Effect.gen(function* () {
				const running = yield* Ref.updateAndGet(active, (n) => n + 1);
				yield* Ref.update(peak, (n) => Math.max(n, running));
				yield* Deferred.succeed(starts[payload.slot], undefined);
				yield* Deferred.await(holds[payload.slot]);
				yield* Ref.update(active, (n) => n - 1);
			}),
		payload: Schema.Struct({ slot: Schema.Literals(["a", "b"]) }),
		tag: "test/limited",
	});
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		const first = yield* kernel.submit(kind, { slot: "a" });
		const second = yield* kernel.submit(kind, { slot: "b" });
		yield* Effect.race(Deferred.await(starts.a), Deferred.await(starts.b));
		expect(yield* db.Intent.where({ status: "queued" }).all()).toHaveLength(1);
		yield* Deferred.succeed(holds.a, undefined);
		yield* Deferred.succeed(holds.b, undefined);
		const outcomes = yield* Effect.all([statusesUntilTerminal(kernel.changes(first.id)), statusesUntilTerminal(kernel.changes(second.id))]);
		for (const statuses of outcomes) {
			expect(statuses.at(-1)).toBe("succeeded");
		}
		expect(yield* Ref.get(peak)).toBe(1);
	}).pipe(Effect.provide(KernelLive({ gates: [maxConcurrency(1)], kinds: [kind] })));
});

it.effectDB("rejects submits for kinds the kernel was not built with", function* () {
	const registered = defineIntent({
		execute: () => Effect.void,
		payload: EMPTY,
		tag: "test/twin",
	});
	const impostor = defineIntent({
		execute: () => Effect.void,
		payload: EMPTY,
		tag: "test/twin",
	});
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		const error = yield* Effect.flip(kernel.submit(impostor, {}));
		expect(error).toMatchObject({
			_tag: "UnregisteredIntentTag",
			tag: "test/twin",
		});
	}).pipe(Effect.provide(KernelLive({ kinds: [registered] })));
});

it.effectDB("holds admission until the system settles, then retries itself", function* () {
	const kind = defineIntent({
		execute: () => Effect.void,
		payload: EMPTY,
		tag: "test/settled",
	});
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(kind, {});
		expect(yield* Stream.runHead(submission.changes)).toEqual(Option.some("queued"));
		yield* TestClock.adjust(40);
		const statuses = yield* statusesUntilTerminal(submission.changes);
		expect(statuses.at(-1)).toBe("succeeded");
	}).pipe(Effect.provide(KernelLive({ gates: [settle(40)], kinds: [kind] })));
});

it.effectDB("samples gauges into the snapshot on every admission pass", function* () {
	const level = yield* Ref.make(1);
	const kind = defineIntent({
		execute: () => Effect.void,
		payload: EMPTY,
		tag: "test/gauged",
	});
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		const blocked = yield* kernel.submit(kind, {});
		const early = yield* Stream.runHead(blocked.changes);
		expect(early).toEqual(Option.some("queued"));
		yield* Ref.set(level, 0);
		const second = yield* kernel.submit(kind, {});
		const first = yield* statusesUntilTerminal(kernel.changes(blocked.id));
		expect(first.at(-1)).toBe("succeeded");
		const rest = yield* statusesUntilTerminal(second.changes);
		expect(rest.at(-1)).toBe("succeeded");
	}).pipe(
		Effect.provide(
			KernelLive({
				gates: [gaugeCeiling("test.level", 1)],
				gauges: { "test.level": Ref.get(level) },
				kinds: [kind],
			}),
		),
	);
});
