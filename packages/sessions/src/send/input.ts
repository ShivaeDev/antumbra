import type { SessionInput } from "@antumbra/plugin-api";
import { BackendCapacities } from "@antumbra/provider-capacity/service";
import { SessionFabric } from "@antumbra/session-fabric";
import { type SessionInputDraft, SessionInputNotFound, SessionInputs } from "@antumbra/session-inputs";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect } from "effect";
import { makeCurrentSessionRecovery } from "#current/recovery.ts";
import { admiralInput } from "#input.ts";
import { makeSessionInputAdmission } from "#input-admission.ts";
import type { SessionSendReceipt, SessionSendRefused } from "#send/errors.ts";

interface OpenSession {
	readonly backend: string;
}

export const makeSendInput = (
	imageInputBackends: ReadonlySet<string>,
	open: (sessionId: string) => Effect.Effect<OpenSession, SessionSendRefused>,
	rouse: (sessionId: string, inputId: SessionInputId) => Effect.Effect<void, SessionSendRefused>,
) =>
	Effect.gen(function* () {
		const admission = yield* makeSessionInputAdmission(imageInputBackends);
		const fabric = yield* SessionFabric;
		const capacities = yield* BackendCapacities;
		const inputs = yield* SessionInputs;
		const recovery = yield* makeCurrentSessionRecovery;
		const accepted = (sessionId: string, inputId: SessionInputId, input: SessionInput) => {
			// Mark execution only after provider handoff succeeds.
			const afterHandoff = recovery.awaken(sessionId).pipe(
				Effect.andThen(inputs.mark(inputId, "accepted")),
				Effect.as<SessionSendReceipt>("accepted"),
				// A failure after provider acceptance makes retry safety unknowable.
				Effect.tapError(() => inputs.mark(inputId, "ambiguous")),
			);
			return fabric.send(sessionId, input).pipe(
				Effect.andThen(afterHandoff),
				Effect.tapErrorTag("BackendFailure", () => inputs.mark(inputId, "ambiguous")),
			);
		};
		const queued = (sessionId: string, inputId: SessionInputId) =>
			rouse(sessionId, inputId).pipe(Effect.andThen(inputs.mark(inputId, "queued_for_wake")), Effect.as<SessionSendReceipt>("queued_for_wake"));
		const handoff = (session: OpenSession, sessionId: string, inputId: SessionInputId, input: SessionInput) =>
			Effect.gen(function* () {
				const capacity = yield* capacities.current(session.backend);
				if (capacity.status === "blocked" || !(yield* fabric.holds(sessionId))) {
					return yield* queued(sessionId, inputId);
				}
				// An attachment may detach after `holds`; the same input then follows the wake path.
				return yield* accepted(sessionId, inputId, input).pipe(Effect.catchTag("SessionNotLive", () => queued(sessionId, inputId)));
			});
		// Reject unsupported parts before ingest installs attachment bytes.
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
