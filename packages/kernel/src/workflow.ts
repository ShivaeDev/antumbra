import { Context, Effect, Schedule, Schema } from "effect";
import { Activity, Workflow, WorkflowEngine } from "effect/unstable/workflow";

const IntentWorkflowPayload = Schema.Struct({
	intentId: Schema.String,
	payloadJson: Schema.String,
});

export interface IntentStepOptions {
	readonly additionalAttempts: number;
}

export class IntentExecution extends Context.Service<
	IntentExecution,
	{
		readonly step: <R>(
			name: string,
			execute: Effect.Effect<void, unknown, R>,
			options?: IntentStepOptions,
		) => Effect.Effect<void, unknown, R>;
	}
>()("@antumbra/kernel/IntentExecution") {}

const makeExecution = (tag: string) =>
	Effect.gen(function* () {
		const engine = yield* WorkflowEngine.WorkflowEngine;
		const instance = yield* WorkflowEngine.WorkflowInstance;
		return IntentExecution.of({
			step: (name, execute, options) => {
				// why: Effect activities retry interruption by default, but kernel cancel
				// and layer teardown must stop promptly; typed failure retries are explicit.
				const activity = Activity.make({
					error: Schema.Unknown,
					execute,
					interruptRetryPolicy: Schedule.recurs(0),
					name: `${tag}/${name}`,
				});
				const attempt =
					options === undefined
						? activity
						: Activity.retry(activity, { times: options.additionalAttempts });
				return attempt.pipe(
					Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
					Effect.provideService(WorkflowEngine.WorkflowInstance, instance),
				);
			},
		});
	});

export const makeIntentWorkflow = (
	tag: string,
	execute: (
		payloadJson: string,
	) => Effect.Effect<void, unknown, IntentExecution>,
) => {
	const workflow = Workflow.make(`antumbra/intent/${tag}`, {
		error: Schema.Unknown,
		idempotencyKey: (payload) => payload.intentId,
		payload: IntentWorkflowPayload,
	});
	const register = Effect.flatMap(WorkflowEngine.WorkflowEngine, (engine) =>
		engine.register(workflow, (payload) =>
			Effect.flatMap(makeExecution(tag), (execution) =>
				execute(payload.payloadJson).pipe(
					Effect.provideService(IntentExecution, execution),
				),
			),
		),
	);
	const run = (intentId: string, payloadJson: string) =>
		Effect.gen(function* () {
			const engine = yield* WorkflowEngine.WorkflowEngine;
			const payload = { intentId, payloadJson };
			const executionId = yield* workflow.executionId(payload);
			// why: intent activities install no workflow compensations, and the RC's
			// cooperative interrupt does not stop an activity already in flight.
			return yield* workflow
				.execute(payload)
				.pipe(
					Effect.onInterrupt(() =>
						engine.interruptUnsafe(workflow, executionId),
					),
				);
		});
	return { register, run };
};
