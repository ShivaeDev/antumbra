import { defineIntent, IntentExecution } from "@antumbra/kernel";
import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { makeCurrentSessionRecovery } from "#current-session-recovery.ts";
import { SessionFabric } from "#fabric.ts";
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
	const fabric = yield* SessionFabric;
	const recovery = yield* makeCurrentSessionRecovery;
	const runtime = yield* SessionRecoveryRuntime;
	// why: a Session the fabric already holds is answering right now. Resuming it
	// would re-admit the live attachment and queue a second recovery instruction
	// into a conversation in progress, so the resume this intent exists to make
	// has already happened and there is nothing left to do.
	const resumed = (sessionId: string) =>
		Effect.gen(function* () {
			if (yield* fabric.holds(sessionId)) {
				return;
			}
			yield* fabric.withStartAdmission((permit) =>
				Effect.gen(function* () {
					const context = yield* load(sessionId);
					if (Option.isNone(context)) {
						return;
					}
					yield* runtime.resume(permit, context.value);
					const execution = yield* IntentExecution;
					yield* execution.step("wake-session", recovery.awaken(sessionId));
				}),
			);
		});
	return defineIntent({
		execute: ({ sessionId }) =>
			resumed(sessionId).pipe(
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
