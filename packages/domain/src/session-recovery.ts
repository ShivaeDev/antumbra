import { defineIntent, IntentExecution } from "@antumbra/kernel";
import type { BackendFailure } from "@antumbra/plugin-api";
import {
	type AgentPrompt,
	admiralWords,
	standingRecovery,
} from "@antumbra/prompts";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect, Result, Schema } from "effect";
import { makeCurrentSessionRecovery } from "#current-session-recovery.ts";
import { makeSessionRecoveryContext } from "#session-recovery-context.ts";
import {
	recoveryHeld,
	type SessionRecoveryHeld,
} from "#session-recovery-error.ts";
import { SessionRecoveryRuntime } from "#session-recovery-runtime.ts";
import {
	type SessionUnresumable,
	SessionUnresumableRefused,
	unresumableDetail,
	unresumableVerdict,
} from "#session-unresumable.ts";
import { SessionWakePatience } from "#session-wake-patience.ts";

// why: an explicit act may travel with the words that caused it, so waking a
// Session and speaking to it are one intent rather than two the caller has to
// sequence. Absent, the Session is being recovered on Antumbra's initiative
// and hears the standing instruction instead.
const RecoveryPayload = Schema.Struct({
	message: Schema.optional(Schema.String),
	sessionId: Schema.String,
});
export type RecoveryFields = typeof RecoveryPayload.Type;

// why: the payload outlives the process that wrote it, so words that were the
// admiral's when the Intent was submitted arrive here as ordinary stored text.
// They re-enter the catalog through the same template that admitted them, and
// nothing else on this path can turn a string into words an Agent hears.
const carried = (message: string | undefined): AgentPrompt | undefined =>
	message === undefined ? undefined : admiralWords({ words: message });

const waitFor = (detail: string) =>
	IntentExecution.use((execution) => execution.wait(detail));

export const makeRecoveryKind = Effect.gen(function* () {
	const load = yield* makeSessionRecoveryContext;
	const fabric = yield* SessionFabric;
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
	const delivered = (sessionId: string, message: AgentPrompt | undefined) =>
		Effect.gen(function* () {
			const idle = yield* fabric.idleSince;
			const words =
				message ?? (idle.has(sessionId) ? standingRecovery : undefined);
			if (words === undefined) {
				return;
			}
			yield* fabric.send(sessionId, words);
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
	const admitted = (sessionId: string, message: AgentPrompt | undefined) =>
		fabric.withStartAdmission((permit) =>
			Effect.gen(function* () {
				const context = yield* load(sessionId);
				if (Result.isFailure(context)) {
					return yield* unresumable(sessionId, context.failure);
				}
				yield* runtime.resume(
					permit,
					context.success,
					message ?? standingRecovery,
				);
				const execution = yield* IntentExecution;
				yield* execution.step("wake-session", recovery.awaken(sessionId));
			}),
		);
	const resumed = (sessionId: string, message: AgentPrompt | undefined) =>
		Effect.gen(function* () {
			if (yield* fabric.holds(sessionId)) {
				return yield* delivered(sessionId, message);
			}
			// why: every wait between here and a live attachment is somebody else's
			// to end — the gate that stopped admitting starts, a provider reading its
			// own storage, a stream that owes an opening frame — and none of them is
			// obliged to. Unbounded, the Intent sits in "running" with nothing to
			// read and the registry entry it left behind answers "held" to every
			// later send. Bounded, the same silence becomes a reason on the row that
			// a later send can push again, and unwinding takes the half-built
			// attachment with it.
			yield* admitted(sessionId, message).pipe(
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
		execute: ({ message, sessionId }) =>
			resumed(sessionId, carried(message)).pipe(
				Effect.catchTags({
					BackendFailure: (failure: BackendFailure) => waitFor(failure.message),
					SessionNotLive: () => waitFor("the attachment went before the words"),
					SessionRecoveryHeld: (failure: SessionRecoveryHeld) =>
						waitFor(failure.detail),
				}),
			),
		payload: RecoveryPayload,
		reclaim: "requeue",
		tag: "agent/recover",
	});
});
