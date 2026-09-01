import { expect, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";
import { defineIntent } from "#intent.ts";
import { IntentExecution } from "#workflow.ts";

const EMPTY = Schema.Struct({});

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
