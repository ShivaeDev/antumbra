import { defineIntent, IntentExecution } from "@antumbra/kernel";
import type { BackendFailure } from "@antumbra/plugin-api";
import { wakeWords } from "@antumbra/prompts";
import { SessionFabric } from "@antumbra/session-fabric";
import { SessionInputs } from "@antumbra/session-inputs";
import { Effect, Result } from "effect";
import type { SessionCapacities } from "#capacity.ts";
import { makeCurrentSessionRecovery } from "#current/recovery.ts";
import { promptInput } from "#input.ts";
import { makeSessionRecoveryContext } from "#recovery/context.ts";
import { recoveryHeld, type SessionRecoveryHeld } from "#recovery/error.ts";
import { SessionRecoveryRuntime } from "#recovery/runtime.ts";
import { unresumable, waitFor } from "#unresumable.ts";
import { accountedWake } from "#wake/account.ts";
import { type CarriedInput, makeLoadCarriedInput, type WakeFields, WakePayload } from "#wake/input.ts";
import { SessionWakePatience } from "#wake/patience.ts";

const attachmentTimedOut = (sessionId: string, patience: number) => recoveryHeld(`${sessionId} did not reach a live attachment within ${patience}ms`);

const waitForBackend = (failure: BackendFailure) => waitFor(failure.message);
const waitForLostAttachment = () => waitFor("the attachment went before the words");
const waitForHeldRecovery = (failure: SessionRecoveryHeld) => waitFor(failure.detail);

// why: the only act that puts a Session back on a provider, and nothing asks
// for it unasked — a hail, a send, or a Piece already assigned to this Session
// submits one. The words that caused it may travel with it, so waking a Session
// and speaking to it are one intent rather than two the caller has to sequence.
// Absent, the wake is an address rather than a message and the Session hears
// the standing instruction instead.
export type { WakeFields } from "#wake/input.ts";

export const makeWakeKind = (capacities: SessionCapacities) =>
	Effect.gen(function* () {
		const load = yield* makeSessionRecoveryContext;
		const fabric = yield* SessionFabric;
		const inputs = yield* SessionInputs;
		const loadCarriedInput = yield* makeLoadCarriedInput;
		const patience = yield* SessionWakePatience;
		const recovery = yield* makeCurrentSessionRecovery;
		const runtime = yield* SessionRecoveryRuntime;
		// why: a Session the fabric already holds needs no resume — it is either
		// answering right now or listening with nothing to do, and both are reached
		// by handing the words to the attachment that is already there. Re-admitting
		// it would open a second conversation over the first. Words the admiral sent
		// are delivered either way; the standing instruction reaches only a Session
		// that said it had nothing to do, because one mid-turn is already doing the
		// thing that instruction would ask for.
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
				// why: every wait between here and a live attachment is somebody else's
				// to end — the gate that stopped admitting starts, a provider reading its
				// own storage, a stream that owes an opening frame — and none of them is
				// obliged to. Unbounded, the Intent sits in "running" with nothing to
				// read and the registry entry it left behind answers "held" to every
				// later send. Bounded, the same silence becomes a reason on the row that
				// a later send can push again, and unwinding takes the half-built
				// attachment with it.
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
					yield* capacities.admit(context.success.backend);
				}
				const input = yield* loadCarriedInput(fields);
				yield* resumed(fields.sessionId, input);
			}).pipe(
				Effect.catchTags({
					BackendFailure: waitForBackend,
					SessionNotLive: waitForLostAttachment,
					SessionRecoveryHeld: waitForHeldRecovery,
				}),
			);
		return defineIntent({
			execute: (fields) => accountedWake(fields.sessionId, runWake(fields)),
			payload: WakePayload,
			reclaim: "requeue",
			tag: "agent/wake",
		});
	});
