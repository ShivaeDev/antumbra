import {
	type IntentKind,
	type IntentNotFound,
	type IntentStatus,
	Kernel,
	type PayloadInvalid,
	type StoredIntentInvalid,
	type UnregisteredIntentTag,
} from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import type { WakeFields } from "@antumbra/sessions";
import { Effect, type Stream } from "effect";

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
// stacking a second address or prompt behind it — the blocker it named may
// have cleared since, and nothing else in the system will ever ask again. An
// input-backed wake is distinct durable custody, so only the same full payload
// may reuse it; another demand must leave its wake intact.
export const makeRouseSession = (wake: IntentKind<WakeFields>) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const watched = (id: string, retried: boolean): SessionRouse => ({
			changes: kernel.changes(id),
			id,
			retried,
		});
		const submitted = (payload: WakeFields) =>
			kernel
				.submit(wake, payload)
				.pipe(Effect.map((submission) => watched(submission.id, false)));
		// why: a retry re-runs the row exactly as it was written, and the kernel
		// offers no way to rewrite a payload — so a demand that differs from the
		// parked wake needs a row of its own, or its input is discarded in favour
		// of the older payload. The parked row is cancelled before the new one is
		// submitted, because a waiting wake can still fire its stale demand.
		const replaced = (id: string, payload: WakeFields) =>
			kernel.cancel(id).pipe(
				Effect.catchTags({
					IntentNotFound: () => Effect.void,
					InvalidTransition: () => Effect.void,
				}),
				Effect.andThen(submitted(payload)),
			);
		const sameDemand = (left: WakeFields, right: WakeFields) =>
			left.inputId === right.inputId &&
			left.message === right.message &&
			left.sessionId === right.sessionId;
		// why: a parked wake that moved on between the read and the push is a wake
		// nobody has to push — but it may also have moved to a terminal status, and
		// the admiral is still owed one. Submitting is the answer to both, because
		// a wake meeting an attachment that arrived meanwhile only hands the
		// words over.
		const pushed = (id: string, payload: WakeFields) =>
			kernel.retry(id).pipe(
				Effect.as(watched(id, true)),
				Effect.catchTags({
					IntentNotFound: () => submitted(payload),
					InvalidTransition: () => submitted(payload),
				}),
			);
		// why: a send cannot take another input-backed wake's row, but merely
		// leaving that row parked means nobody will ever ask it to run again. Push
		// every other carried input before handling this demand. A race means the
		// old wake already moved and therefore needs no replacement.
		const advance = (id: string) =>
			kernel.retry(id).pipe(
				Effect.catchTags({
					IntentNotFound: () => Effect.void,
					InvalidTransition: () => Effect.void,
				}),
			);
		const advanceInputs = (
			parked: ReadonlyArray<{
				readonly id: string;
				readonly payload: WakeFields;
			}>,
			exceptId?: string,
		) =>
			Effect.forEach(
				parked.filter(
					(intent) =>
						intent.id !== exceptId && intent.payload.inputId !== undefined,
				),
				(intent) => advance(intent.id),
				{ concurrency: 1, discard: true },
			);
		return (payload: WakeFields): Effect.Effect<SessionRouse, RouseRefused> =>
			Effect.gen(function* () {
				const active = yield* kernel.active(wake);
				const parked = active.filter(
					(intent) =>
						intent.payload.sessionId === payload.sessionId &&
						intent.status === "waiting",
				);
				const same = parked.find((intent) =>
					sameDemand(intent.payload, payload),
				);
				if (same !== undefined) {
					yield* advanceInputs(parked, same.id);
					return yield* pushed(same.id, payload);
				}
				yield* advanceInputs(parked);
				const replaceable = parked.find(
					(intent) => intent.payload.inputId === undefined,
				);
				return yield* replaceable === undefined
					? submitted(payload)
					: replaced(replaceable.id, payload);
			});
	});
