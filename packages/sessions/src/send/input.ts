import type { SessionInput } from "@antumbra/plugin-api";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	type SessionInputDraft,
	SessionInputNotFound,
	SessionInputs,
} from "@antumbra/session-inputs";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect } from "effect";
import type { SessionCapacities } from "#capacity.ts";
import { makeCurrentSessionRecovery } from "#current/recovery.ts";
import { admiralInput } from "#input.ts";
import { makeSessionInputAdmission } from "#input-admission.ts";
import type { SessionSendReceipt, SessionSendRefused } from "#send/errors.ts";

// why: the only thing this needs to know about the Session is which provider
// stands behind it, because that is the whole of what decides whether these
// parts may be sent at all. Everything else about the Session's state was
// already settled by the seam that hands `open` in.
interface OpenSession {
	readonly backend: string;
}

// why: one durable input on its way to a provider — admitted, taken into
// custody, handed over, and answered for afterwards. It sits apart from the
// send seam because the seam's subject is a Session's state and this one's is
// an input's fate, and the two stopped fitting in one reading.
export const makeSendInput = (
	imageInputBackends: ReadonlySet<string>,
	open: (sessionId: string) => Effect.Effect<OpenSession, SessionSendRefused>,
	rouse: (
		sessionId: string,
		inputId: SessionInputId,
	) => Effect.Effect<void, SessionSendRefused>,
	capacities: SessionCapacities,
) =>
	Effect.gen(function* () {
		const admission = yield* makeSessionInputAdmission(imageInputBackends);
		const fabric = yield* SessionFabric;
		const inputs = yield* SessionInputs;
		const recovery = yield* makeCurrentSessionRecovery;
		const accepted = (
			sessionId: string,
			inputId: SessionInputId,
			input: SessionInput,
		) => {
			// why: the wake is written after the words are taken, never before — a row
			// claiming a Session is executing when the handover failed is durable truth
			// nobody can see is false.
			const afterHandoff = recovery.awaken(sessionId).pipe(
				Effect.andThen(inputs.mark(inputId, "accepted")),
				Effect.as<SessionSendReceipt>("accepted"),
				// why: once the provider accepted the input, a later database failure
				// loses receipt certainty. Persist ambiguity before exposing that error so
				// an explicit retry cannot blindly duplicate the logical message.
				Effect.tapError(() => inputs.mark(inputId, "ambiguous")),
			);
			return fabric.send(sessionId, input).pipe(
				Effect.andThen(afterHandoff),
				Effect.tapErrorTag("BackendFailure", () =>
					inputs.mark(inputId, "ambiguous"),
				),
			);
		};
		const queued = (sessionId: string, inputId: SessionInputId) =>
			rouse(sessionId, inputId).pipe(
				Effect.andThen(inputs.mark(inputId, "queued_for_wake")),
				Effect.as<SessionSendReceipt>("queued_for_wake"),
			);
		const handoff = (
			session: OpenSession,
			sessionId: string,
			inputId: SessionInputId,
			input: SessionInput,
		) =>
			Effect.gen(function* () {
				const capacity = yield* capacities.current(session.backend);
				if (
					capacity.status === "blocked" ||
					!(yield* fabric.holds(sessionId))
				) {
					return yield* queued(sessionId, inputId);
				}
				// why: the attachment can go between being seen and being spoken to —
				// a reclaim settling in the same breath — and the words follow it into
				// the resume rather than being reported as a refusal.
				return yield* accepted(sessionId, inputId, input).pipe(
					Effect.catchTag("SessionNotLive", () => queued(sessionId, inputId)),
				);
			});
		// why: taking custody is what costs disk and what outlives the request, so
		// the backend is asked whether it can receive these parts at all before a
		// single byte is normalized or installed. A text-only provider refuses with
		// nothing written down for a later sweep to find.
		return (draft: SessionInputDraft) =>
			Effect.gen(function* () {
				const sessionId = draft.sessionId;
				const inputId = draft.id;
				const session = yield* open(sessionId);
				yield* admission.admitDraft(session.backend, draft.parts);
				const reading = yield* inputs.ingest(draft);
				const replay = yield* admission.replayed(reading.status, inputId);
				if (replay !== undefined) {
					return replay;
				}
				const stored = yield* inputs.load(inputId);
				if (stored.sessionId !== sessionId) {
					return yield* new SessionInputNotFound({ inputId });
				}
				const input = admiralInput(stored.input);
				yield* admission.admit(session.backend, inputId, input);
				return yield* handoff(session, sessionId, inputId, input);
			});
	});
