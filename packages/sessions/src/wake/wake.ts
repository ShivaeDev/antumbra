import { defineIntent, IntentExecution } from "@antumbra/kernel";
import { wakeWords } from "@antumbra/prompts";
import { BackendCapacities } from "@antumbra/provider-capacity/service";
import { SessionFabric } from "@antumbra/session-fabric";
import { SessionInputs } from "@antumbra/session-inputs";
import { Effect, Result } from "effect";
import { admitCapacity } from "#admission/admit.ts";
import { makeCurrentSessionRecovery } from "#current/recovery.ts";
import { promptInput } from "#input.ts";
import { makeSessionRecoveryContext } from "#recovery/context.ts";
import { recoveryHeld } from "#recovery/error.ts";
import { SessionRecoveryRuntime } from "#recovery/service.ts";
import { unresumable, waitFor } from "#unresumable.ts";
import { accountedWake } from "#wake/account.ts";
import { type CarriedInput, makeLoadCarriedInput, type WakeFields, WakePayload } from "#wake/input.ts";
import { SessionWakePatience } from "#wake/patience.ts";

const attachmentTimedOut = (sessionId: string, patience: number) => recoveryHeld(`${sessionId} did not reach a live attachment within ${patience}ms`);

export type { WakeFields } from "#wake/input.ts";

export const makeWakeKind = Effect.gen(function* () {
	const capacities = yield* BackendCapacities;
	const load = yield* makeSessionRecoveryContext;
	const fabric = yield* SessionFabric;
	const inputs = yield* SessionInputs;
	const loadCarriedInput = yield* makeLoadCarriedInput;
	const patience = yield* SessionWakePatience;
	const recovery = yield* makeCurrentSessionRecovery;
	const runtime = yield* SessionRecoveryRuntime;
	// An existing attachment receives carried input; only an idle attachment receives the generic wake instruction.
	const delivered = (sessionId: string, carriedInput: CarriedInput) =>
		Effect.gen(function* () {
			const idle = yield* fabric.idleSince();
			const input = carriedInput.input ?? (idle.has(sessionId) ? promptInput(wakeWords) : undefined);
			if (input === undefined) {
				return;
			}
			yield* fabric.send(sessionId, input);
			if (carriedInput.inputId !== undefined) {
				yield* inputs.mark(carriedInput.inputId, "accepted");
			}
			const execution = yield* IntentExecution;
			yield* execution.step("wake-session", recovery.awaken(sessionId));
		});
	const admitted = (sessionId: string, carriedInput: CarriedInput) =>
		fabric.withStartAdmission((permit) =>
			Effect.gen(function* () {
				const context = yield* load(sessionId);
				if (Result.isFailure(context)) {
					return yield* unresumable(sessionId, context.failure);
				}
				yield* runtime.resume(permit, context.success, carriedInput.input ?? promptInput(wakeWords));
				if (carriedInput.inputId !== undefined) {
					yield* inputs.mark(carriedInput.inputId, "accepted");
				}
				const execution = yield* IntentExecution;
				yield* execution.step("wake-session", recovery.awaken(sessionId));
			}),
		);
	const resumed = (sessionId: string, carriedInput: CarriedInput) =>
		Effect.gen(function* () {
			if (yield* fabric.holds(sessionId)) {
				return yield* delivered(sessionId, carriedInput);
			}
			// Bound resume so stalled admission or provider opening unwinds the partial attachment and leaves a retryable reason.
			yield* admitted(sessionId, carriedInput).pipe(
				Effect.timeoutOrElse({
					duration: patience,
					orElse: () => attachmentTimedOut(sessionId, patience),
				}),
			);
		});
	const runWake = (fields: WakeFields) =>
		Effect.gen(function* () {
			const context = yield* load(fields.sessionId);
			if (Result.isSuccess(context)) {
				yield* admitCapacity(context.success.backend).pipe(Effect.provideService(BackendCapacities, capacities));
			}
			const input = yield* loadCarriedInput(fields);
			yield* resumed(fields.sessionId, input);
		}).pipe(
			Effect.catchTags({
				BackendFailure: (failure: { readonly message: string }) => waitFor(failure.message),
				SessionNotLive: () => waitFor("the attachment went before the words"),
				SessionRecoveryHeld: (failure: { readonly detail: string }) => waitFor(failure.detail),
			}),
		);
	return defineIntent({
		execute: (fields) => accountedWake(fields.sessionId, runWake(fields)),
		payload: WakePayload,
		reclaim: "requeue",
		tag: "agent/wake",
	});
});
