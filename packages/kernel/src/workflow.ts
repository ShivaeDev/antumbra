import { Context, Effect, Predicate, Schedule, Schema } from "effect";
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

// The workflow engine stores a step's failure as JSON, so the step hands it over as data that reads back as an error.
class IntentStepFailure extends Schema.Error<IntentStepFailure>("IntentStepFailure")({
	_tag: Schema.String,
	detail: Schema.optional(Schema.String),
	message: Schema.String,
}) {
	override get name(): string {
		return this._tag;
	}
}

const textOf = (source: unknown, key: string) => {
	if (!Predicate.hasProperty(source, key)) {
		return undefined;
	}
	const value = source[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
};

const stepFailureOf = (error: unknown) => {
	const detail = textOf(error, "detail");
	return new IntentStepFailure({
		_tag: textOf(error, "_tag") ?? "IntentStepFailure",
		detail,
		message: textOf(error, "message") ?? detail ?? String(error),
	});
};

export class IntentExecution extends Context.Service<
	IntentExecution,
	{
		readonly intentId: string;
		readonly step: <R>(name: string, execute: Effect.Effect<void, unknown, R>) => Effect.Effect<void, unknown, R>;
		readonly wait: (detail: string) => Effect.Effect<never, unknown>;
	}
>()("@antumbra/kernel/IntentExecution") {}

const makeExecution = (tag: string, intentId: string) =>
	Effect.gen(function* () {
		const engine = yield* WorkflowEngine.WorkflowEngine;
		const instance = yield* WorkflowEngine.WorkflowInstance;
		return IntentExecution.of({
			intentId,
			step: (name, execute) => {
				// Effect activities retry interruption by default; kernel cancellation must not.
				const activity = Activity.make({
					error: IntentStepFailure,
					execute: Effect.mapError(execute, stepFailureOf),
					interruptRetryPolicy: Schedule.recurs(0),
					name: `${tag}/${name}`,
				});
				return activity.pipe(
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
			// WorkflowEngine's cooperative interrupt does not stop an activity already in flight.
			return yield* workflow.execute(payload).pipe(Effect.onInterrupt(() => engine.interruptUnsafe(workflow, executionId)));
		});
	const run = (intentId: string, payloadJson: string) =>
		register.pipe(
			Effect.andThen(executeWorkflow(intentId, payloadJson)),
			Effect.scoped,
			Effect.provide(WorkflowEngine.layerMemory, { local: true }),
			// An Intent outlives its submitter, so its trace is a root named by the bounded kind tag.
			Effect.withSpan(`intent ${tag}`, { root: true }),
			Effect.annotateSpans({ intentId }),
		);
	return { run };
};
