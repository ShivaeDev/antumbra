import { acquireTemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Schema, Stream } from "effect";
import type { IntentStatus } from "#fsm.ts";
import { defineIntent } from "#intent.ts";
import { Kernel } from "#kernel.ts";
import { kernelLayer, statusesUntilTerminal } from "#test/harness.ts";
import { IntentExecution } from "#workflow.ts";

const waitUntil = <E, R>(changes: Stream.Stream<IntentStatus, E, R>, status: IntentStatus) =>
	changes.pipe(
		Stream.takeUntil((current) => current === status),
		Stream.runDrain,
	);

it.live("retries only the waiting intent with the expected detail", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const kind = defineIntent({
			execute: (payload) => IntentExecution.use((execution) => execution.wait(payload.detail)),
			payload: Schema.Struct({ detail: Schema.String }),
			tag: "test/retry-if-waiting",
		});
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const stale = yield* kernel.submit(kind, { detail: "capacity:stale" });
			const matching = yield* kernel.submit(kind, { detail: "capacity:match" });
			yield* waitUntil(stale.changes, "waiting");
			yield* waitUntil(matching.changes, "waiting");

			expect(yield* kernel.retryIfWaiting(stale.id, "capacity:superseded")).toBe(false);
			expect(yield* kernel.retryIfWaiting(matching.id, "capacity:match")).toBe(true);

			yield* waitUntil(kernel.changes(matching.id), "waiting");
			yield* kernel.cancel(stale.id);
			yield* kernel.cancel(matching.id);
			yield* statusesUntilTerminal(kernel.changes(stale.id));
			yield* statusesUntilTerminal(kernel.changes(matching.id));
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [kind] })));
	}),
);
