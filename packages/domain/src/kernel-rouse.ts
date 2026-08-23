import {
	type IntentKind,
	type IntentNotFound,
	type IntentStatus,
	Kernel,
	type PayloadInvalid,
	type StoredIntentInvalid,
	type UnregisteredIntentTag,
} from "@antumbra/kernel";
import type { PrismaError, WriteExecutors } from "@antumbra/persistence";
import { Effect, Stream } from "effect";
import type { RecoveryFields } from "#session-recovery.ts";

// why: the three ways the kernel can turn a submission away — a payload it
// cannot decode, a tag no domain registered, or the write that records the
// submission failing. Every act that reaches the kernel refuses this way.
export type SpawnRefused = PayloadInvalid | PrismaError | UnregisteredIntentTag;

// why: rousing reads the durable Intent rows before it decides, so a row it
// cannot read is a refusal of its own — one that submitting alone never had.
export type RouseRefused = SpawnRefused | StoredIntentInvalid;

// why: the wake is handed back rather than fired and forgotten, because a
// caller that does not watch it is exactly how a parked wake became invisible.
// `retried` says which act this was: a fresh demand, or a second push at one
// the record already held.
export interface SessionRouse {
	readonly changes: Stream.Stream<IntentStatus, IntentNotFound | PrismaError>;
	readonly id: string;
	readonly retried: boolean;
}

// why: the admiral's send is the only thing that wakes a Session, so a send
// meeting a wake already parked in waiting settles that one rather than
// stacking a second demand behind it — the blocker it named may have cleared
// since, and nothing else in the system will ever ask again. What "settles"
// means depends on the words: the same words are the same demand and it is
// pushed, and different words are a different demand that replaces it.
export const makeRouseSession = (recover: IntentKind<RecoveryFields>) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const executors = yield* Effect.context<WriteExecutors>();
		const watched = (id: string, retried: boolean): SessionRouse => ({
			changes: kernel.changes(id).pipe(Stream.provideContext(executors)),
			id,
			retried,
		});
		const submitted = (payload: RecoveryFields) =>
			kernel
				.submit(recover, payload)
				.pipe(Effect.map((submission) => watched(submission.id, false)));
		// why: a retry re-runs the row exactly as it was written, and the kernel
		// offers no way to rewrite a payload — so words that differ from the ones
		// the parked wake already carries need a row of their own, or the newest
		// message is written down and then discarded in favour of an older one.
		// The parked row is cancelled before the new one is submitted, because a
		// wake left waiting still carries its stale words and can still fire them.
		const replaced = (id: string, payload: RecoveryFields) =>
			kernel.cancel(id).pipe(
				Effect.catchTags({
					IntentNotFound: () => Effect.void,
					InvalidTransition: () => Effect.void,
				}),
				Effect.andThen(submitted(payload)),
			);
		// why: a parked wake that moved on between the read and the push is a wake
		// nobody has to push — but it may also have moved to a terminal status, and
		// the admiral is still owed one. Submitting is the answer to both, because
		// a recover meeting an attachment that arrived meanwhile only hands the
		// words over.
		const pushed = (
			id: string,
			carried: string | undefined,
			payload: RecoveryFields,
		) =>
			carried !== payload.message
				? replaced(id, payload)
				: kernel.retry(id).pipe(
						Effect.as(watched(id, true)),
						Effect.catchTags({
							IntentNotFound: () => submitted(payload),
							InvalidTransition: () => submitted(payload),
						}),
					);
		return (
			payload: RecoveryFields,
		): Effect.Effect<SessionRouse, RouseRefused> =>
			Effect.gen(function* () {
				const active = yield* kernel.active(recover);
				const parked = active.find(
					(intent) =>
						intent.payload.sessionId === payload.sessionId &&
						intent.status === "waiting",
				);
				return yield* parked === undefined
					? submitted(payload)
					: pushed(parked.id, parked.payload.message, payload);
			}).pipe(Effect.provideContext(executors));
	});
