import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, Schema, Stream } from "effect";
import type { IntentStatus } from "#fsm.ts";
import { defineIntent } from "#intent.ts";
import { Kernel } from "#kernel.ts";
import { KernelLive } from "#layer.ts";
import { transitionRow } from "#transitions.ts";
import { IntentExecution } from "#workflow.ts";

const EMPTY = Schema.Struct({});

const LOCKED = "the chart room is locked";

const rowOf = (id: string) => Database.use((db) => db.Intent.where({ id }).first()).pipe(Effect.map(Option.getOrThrow));

const untilWaiting = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => status === "waiting"),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

it.effectDB("a move that carries no detail leaves the last reason standing", function* (db) {
	yield* db.Intent.create({
		detail: LOCKED,
		id: "intent-detail",
		payload: "{}",
		status: "waiting",
		tag: "test/detail",
	});

	yield* transitionRow("intent-detail", "retry");
	const queued = yield* rowOf("intent-detail");
	expect(queued.status).toBe("queued");
	expect(queued.detail).toBe(LOCKED);

	yield* transitionRow("intent-detail", "admit");
	const running = yield* rowOf("intent-detail");
	expect(running.status).toBe("running");
	expect(running.detail).toBe(LOCKED);

	yield* transitionRow("intent-detail", "fail", "the key is bent");
	const failed = yield* rowOf("intent-detail");
	expect(failed.status).toBe("failed");
	expect(failed.detail).toBe("the key is bent");
});

it.effectDB("a cancelled intent still says what it was waiting for", function* () {
	const parked = defineIntent({
		execute: () => IntentExecution.use((execution) => execution.wait(LOCKED)),
		payload: EMPTY,
		tag: "test/parked",
	});
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(parked, {});
		expect(yield* untilWaiting(submission.changes)).toBe("waiting");
		yield* kernel.cancel(submission.id);
		const cancelled = yield* rowOf(submission.id);
		expect(cancelled.status).toBe("cancelled");
		expect(cancelled.detail).toContain(LOCKED);
	}).pipe(Effect.provide(KernelLive({ kinds: [parked] })));
});
