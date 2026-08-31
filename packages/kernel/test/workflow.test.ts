import { expect, it } from "@effect/vitest";
import { Context, Effect, Ref, Schema } from "effect";
import { defineIntent } from "#intent.ts";
import { IntentExecution } from "#workflow.ts";

const EMPTY = Schema.Struct({});

class RetryCounter extends Context.Service<RetryCounter, { readonly next: Effect.Effect<number> }>()("test/RetryCounter") {}

const failFirstAttempt = (attempt: number) => (attempt === 1 ? Effect.fail("transient") : Effect.void);

it.effect("retries a typed failure while preserving step service requirements", () =>
	Effect.gen(function* () {
		const attempts = yield* Ref.make(0);
		const counter = RetryCounter.of({
			next: Ref.updateAndGet(attempts, (count) => count + 1),
		});
		const retryable = RetryCounter.use((service) => Effect.flatMap(service.next, failFirstAttempt));
		const retryStep = IntentExecution.use((execution) =>
			execution.step("retryable-step", retryable, { additionalAttempts: 1 }).pipe(Effect.provideService(RetryCounter, counter)),
		);
		const kind = defineIntent({
			execute: () => retryStep,
			payload: EMPTY,
			tag: "test/activity-replay",
		});
		const payload = yield* kind.encode({});
		yield* kind.run("intent-replay", payload);
		expect(yield* Ref.get(attempts)).toBe(2);
	}),
);

it.effect("runs the same intent id in separate admission scopes", () =>
	Effect.gen(function* () {
		const executions = yield* Ref.make(0);
		const kind = defineIntent({
			execute: () =>
				Effect.gen(function* () {
					const execution = yield* IntentExecution;
					yield* execution.step(
						"record",
						Ref.update(executions, (count) => count + 1),
					);
				}),
			payload: EMPTY,
			tag: "test/attempt-scope",
		});
		const payload = yield* kind.encode({});
		yield* kind.run("intent-repeat", payload);
		yield* kind.run("intent-repeat", payload);
		expect(yield* Ref.get(executions)).toBe(2);
	}),
);
