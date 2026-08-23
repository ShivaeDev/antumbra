import { defineIntent, IntentExecution } from "@antumbra/kernel";
import type { BackendFailure } from "@antumbra/plugin-api";
import { standingRecovery } from "@antumbra/prompts";
import { SessionFabric } from "@antumbra/session-fabric";
import { SessionInputs } from "@antumbra/session-inputs";
import { Effect, Result } from "effect";
import { makeCurrentSessionRecovery } from "#current-session-recovery.ts";
import { promptInput } from "#session-input.ts";
import { makeSessionRecoveryContext } from "#session-recovery-context.ts";
import {
	recoveryHeld,
	type SessionRecoveryHeld,
} from "#session-recovery-error.ts";
import {
	type CarriedInput,
	makeLoadCarriedInput,
	RecoveryPayload,
} from "#session-recovery-input.ts";
import { SessionRecoveryRuntime } from "#session-recovery-runtime.ts";
import {
	type SessionUnresumable,
	SessionUnresumableRefused,
	unresumableDetail,
	unresumableVerdict,
} from "#session-unresumable.ts";
import { accountedWake } from "#session-wake-account.ts";
import { SessionWakePatience } from "#session-wake-patience.ts";

// why: an explicit act may travel with the words that caused it, so waking a
// Session and speaking to it are one intent rather than two the caller has to
// sequence. Absent, the Session is being recovered on Antumbra's initiative
// and hears the standing instruction instead.
export type { RecoveryFields } from "#session-recovery-input.ts";

const waitFor = (detail: string) =>
	IntentExecution.use((execution) => execution.wait(detail));

export const makeRecoveryKind = Effect.gen(function* () {
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
			const idle = yield* fabric.idleSince;
			const input =
				carriedInput.input ??
				(idle.has(sessionId) ? promptInput(standingRecovery) : undefined);
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
	// why: nothing to resume is never nothing to say. The reason decides between
	// parking the Intent where a later act can pick it up and refusing it
	// outright, and either way the sentence lands on the row — a recover that
	// succeeded having done nothing is the silence this whole path is for.
	const unresumable = (sessionId: string, reason: SessionUnresumable) => {
		const detail = unresumableDetail(sessionId, reason);
		return unresumableVerdict(reason) === "wait"
			? waitFor(detail)
			: Effect.fail(
					new SessionUnresumableRefused({
						detail,
						reason: reason._tag,
						sessionId,
					}),
				);
	};
	const admitted = (sessionId: string, carriedInput: CarriedInput) =>
		fabric.withStartAdmission((permit) =>
			Effect.gen(function* () {
				const context = yield* load(sessionId);
				if (Result.isFailure(context)) {
					return yield* unresumable(sessionId, context.failure);
				}
				yield* runtime.resume(
					permit,
					context.success,
					carriedInput.input ?? promptInput(standingRecovery),
				);
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
					orElse: () =>
						recoveryHeld(
							`${sessionId} did not reach a live attachment within ${patience}ms`,
						),
				}),
			);
		});
	return defineIntent({
		execute: (fields) =>
			accountedWake(
				fields.sessionId,
				Effect.flatMap(loadCarriedInput(fields), (input) =>
					resumed(fields.sessionId, input),
				).pipe(
					Effect.catchTags({
						BackendFailure: (failure: BackendFailure) =>
							waitFor(failure.message),
						SessionNotLive: () =>
							waitFor("the attachment went before the words"),
						SessionRecoveryHeld: (failure: SessionRecoveryHeld) =>
							waitFor(failure.detail),
					}),
				),
			),
		payload: RecoveryPayload,
		reclaim: "requeue",
		tag: "agent/recover",
	});
});
