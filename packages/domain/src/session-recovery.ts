import { defineIntent, IntentExecution } from "@antumbra/kernel";
import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { makeSessionRecoveryContext } from "#session-recovery-context.ts";
import type { SessionRecoveryHeld } from "#session-recovery-error.ts";
import { SessionRecoveryRuntime } from "#session-recovery-runtime.ts";

export const RECOVERY_INSTRUCTION =
	"Reconcile durable Antumbra truth and continue your assigned work.";

const RecoveryPayload = Schema.Struct({ sessionId: Schema.String });
export type RecoveryFields = typeof RecoveryPayload.Type;

const waitFor = (detail: string) =>
	IntentExecution.use((execution) => execution.wait(detail));

export const makeRecoveryKind = Effect.gen(function* () {
	const load = yield* makeSessionRecoveryContext;
	const runtime = yield* SessionRecoveryRuntime;
	return defineIntent({
		execute: ({ sessionId }) =>
			Effect.gen(function* () {
				const context = yield* load(sessionId);
				if (Option.isSome(context)) {
					yield* runtime.resume(context.value);
				}
			}).pipe(
				Effect.catchTags({
					BackendFailure: (failure: BackendFailure) => waitFor(failure.message),
					SessionRecoveryHeld: (failure: SessionRecoveryHeld) =>
						waitFor(failure.detail),
				}),
			),
		payload: RecoveryPayload,
		reclaim: "requeue",
		tag: "agent/recover",
	});
});
