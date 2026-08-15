import { expect, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";
import { Activity, Workflow, WorkflowEngine } from "effect/unstable/workflow";
import { defineIntent } from "#intent.ts";
import { IntentExecution } from "#workflow.ts";

const EMPTY = Schema.Struct({});

const failFirstAttempt = (attempt: number) =>
	attempt === 1 ? Effect.fail("transient") : Effect.void;

const runRegistered = (
	kind: ReturnType<typeof defineIntent<typeof EMPTY>>,
	intentId: string,
	payload: string,
) => kind.registerWorkflow.pipe(Effect.andThen(kind.run(intentId, payload)));

it.effect(
	"deduplicates a completed workflow after bounded activity attempts",
	() =>
		Effect.gen(function* () {
			const attempts = yield* Ref.make(0);
			const retryable = Ref.updateAndGet(attempts, (count) => count + 1).pipe(
				Effect.flatMap(failFirstAttempt),
			);
			const kind = defineIntent({
				execute: () =>
					Effect.gen(function* () {
						const execution = yield* IntentExecution;
						yield* execution.step("retryable-step", retryable, {
							additionalAttempts: 1,
						});
					}),
				payload: EMPTY,
				tag: "test/activity-replay",
			});
			const payload = yield* kind.encode({});
			yield* Effect.gen(function* () {
				yield* kind.registerWorkflow;
				yield* kind.run("intent-replay", payload);
				yield* kind.run("intent-replay", payload);
			}).pipe(Effect.provide(WorkflowEngine.layerMemory));
			expect(yield* Ref.get(attempts)).toBe(2);
		}),
);

it.effect("keeps workflow history separate for different intent ids", () =>
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
			tag: "test/history-separation",
		});
		const payload = yield* kind.encode({});
		yield* Effect.gen(function* () {
			yield* kind.registerWorkflow;
			yield* kind.run("intent-one", payload);
			yield* kind.run("intent-two", payload);
			yield* kind.run("intent-one", payload);
		}).pipe(Effect.provide(WorkflowEngine.layerMemory));
		expect(yield* Ref.get(executions)).toBe(2);
	}),
);

it.effect("replays a stored activity result for the same execution", () =>
	Effect.gen(function* () {
		const activityRuns = yield* Ref.make(0);
		const workflow = Workflow.make("test/activity-replay", {
			idempotencyKey: (payload) => payload.id,
			payload: { id: Schema.String },
		});
		const activity = Activity.make({
			execute: Ref.update(activityRuns, (count) => count + 1),
			name: "stored-result",
		});
		yield* Effect.gen(function* () {
			const engine = yield* WorkflowEngine.WorkflowEngine;
			const instance = WorkflowEngine.WorkflowInstance.initial(
				workflow,
				"execution-replay",
			);
			const execute = engine
				.activityExecute(activity, 1)
				.pipe(Effect.provideService(WorkflowEngine.WorkflowInstance, instance));
			expect((yield* execute)._tag).toBe("Complete");
			expect((yield* execute)._tag).toBe("Complete");
		}).pipe(Effect.provide(WorkflowEngine.layerMemory));
		expect(yield* Ref.get(activityRuns)).toBe(1);
	}),
);

it.effect("a new in-memory engine starts the workflow again", () =>
	Effect.gen(function* () {
		const executions = yield* Ref.make(0);
		const kind = defineIntent({
			execute: () =>
				Effect.gen(function* () {
					const execution = yield* IntentExecution;
					yield* execution.step(
						"observable-step",
						Ref.update(executions, (count) => count + 1),
					);
				}),
			payload: EMPTY,
			tag: "test/memory-boundary",
		});
		const payload = yield* kind.encode({});
		yield* runRegistered(kind, "intent-restart", payload).pipe(
			Effect.provide(WorkflowEngine.layerMemory),
		);
		yield* runRegistered(kind, "intent-restart", payload).pipe(
			Effect.provide(WorkflowEngine.layerMemory),
		);
		expect(yield* Ref.get(executions)).toBe(2);
	}),
);
