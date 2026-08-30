import { Context, Effect, Schedule, Schema } from "effect";
import { Activity, Workflow, WorkflowEngine } from "effect/unstable/workflow";

const IntentWorkflowPayload = Schema.Struct({
	intentId: Schema.String,
	payloadJson: Schema.String,
});

const IntentWaitSignal = Schema.Struct({
	_tag: Schema.Literal("IntentWaitSignal"),
	detail: Schema.String,
});
type IntentWaitSignal = typeof IntentWaitSignal.Type;

export const isIntentWaitSignal = Schema.is(IntentWaitSignal);

export interface IntentStepOptions {
	readonly additionalAttempts: number;
}

export class IntentExecution extends Context.Service<
	IntentExecution,
	{
		readonly intentId: string;
		readonly step: <R>(name: string, execute: Effect.Effect<void, unknown, R>, options?: IntentStepOptions) => Effect.Effect<void, unknown, R>;
		readonly wait: (detail: string) => Effect.Effect<never, unknown>;
	}
>()("@antumbra/kernel/IntentExecution") {}

const makeExecution = (tag: string, intentId: string) =>
	Effect.gen(function* () {
		const engine = yield* WorkflowEngine.WorkflowEngine;
		const instance = yield* WorkflowEngine.WorkflowInstance;
		return IntentExecution.of({
			intentId,
			step: (name, execute, options) => {
				// why: Effect activities retry interruption by default, but kernel cancel
				// and layer teardown must stop promptly; typed failure retries are explicit.
				const activity = Activity.make({
					error: Schema.Unknown,
					execute,
					interruptRetryPolicy: Schedule.recurs(0),
					name: `${tag}/${name}`,
				});
				const attempt = options === undefined ? activity : Activity.retry(activity, { times: options.additionalAttempts });
				return attempt.pipe(
					Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
					Effect.provideService(WorkflowEngine.WorkflowInstance, instance),
				);
			},
			wait: (detail) =>
				Effect.fail({
					_tag: "IntentWaitSignal",
					detail,
				} satisfies IntentWaitSignal),
		});
	});

export const makeIntentWorkflow = (tag: string, execute: (payloadJson: string) => Effect.Effect<void, unknown, IntentExecution>) => {
	const workflow = Workflow.make(`antumbra/intent/${tag}`, {
		error: Schema.Unknown,
		idempotencyKey: (payload) => payload.intentId,
		payload: IntentWorkflowPayload,
	});
	const register = Effect.flatMap(WorkflowEngine.WorkflowEngine, (engine) =>
		engine.register(workflow, (payload) =>
			Effect.flatMap(makeExecution(tag, payload.intentId), (execution) =>
				execute(payload.payloadJson).pipe(Effect.provideService(IntentExecution, execution)),
			),
		),
	);
	const executeWorkflow = (intentId: string, payloadJson: string) =>
		Effect.gen(function* () {
			const engine = yield* WorkflowEngine.WorkflowEngine;
			const payload = { intentId, payloadJson };
			const executionId = yield* workflow.executionId(payload);
			// why: intent activities install no workflow compensations, and the RC's
			// cooperative interrupt does not stop an activity already in flight.
			return yield* workflow.execute(payload).pipe(Effect.onInterrupt(() => engine.interruptUnsafe(workflow, executionId)));
		});
	const run = (intentId: string, payloadJson: string) =>
		register.pipe(
			Effect.andThen(executeWorkflow(intentId, payloadJson)),
			Effect.scoped,
			Effect.provide(WorkflowEngine.layerMemory, { local: true }),
			// why: the drain fiber that admits an intent carries no span, so an
			// intent's work recorded nothing and the id annotated below it had
			// nothing to attach to. The name is the kind — a bounded set — and the
			// ids stay annotations, so a trace is read by kind rather than by a
			// name per intent. It roots on purpose: an intent outlives whatever
			// asked for it, so its trace is its own and not a caller's.
			Effect.withSpan(`intent ${tag}`, { root: true }),
			Effect.annotateSpans({ intentId }),
		);
	return { run };
};
