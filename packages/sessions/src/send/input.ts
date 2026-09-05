import { BackendCapacities } from "@antumbra/provider-capacity/service";
import { SessionFabric } from "@antumbra/session-fabric";
import { type SessionInputDraft, SessionInputNotFound, SessionInputs } from "@antumbra/session-inputs";
import { Effect, type Scope } from "effect";
import { makeCurrentSessionRecovery } from "#current/recovery.ts";
import { admiralInput } from "#input.ts";
import { makeSessionInputAdmission } from "#input-admission.ts";
import type { SessionSendReceipt } from "#send/errors.ts";
import { openSession } from "#send/open.ts";
import { SessionSendOptions } from "#send/options.ts";
import { rouseSession } from "#send/rouse.ts";

export const sendInput = (scope: Scope.Scope) =>
	Effect.fn("SessionSend.sendInput")(function* (draft: SessionInputDraft) {
		const { imageInputBackends } = yield* SessionSendOptions;
		const admission = yield* makeSessionInputAdmission(imageInputBackends);
		const fabric = yield* SessionFabric;
		const capacities = yield* BackendCapacities;
		const inputs = yield* SessionInputs;
		const recovery = yield* makeCurrentSessionRecovery;
		const sessionId = draft.sessionId;
		const inputId = draft.id;
		const session = yield* openSession(sessionId);
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
		const queued = rouseSession(scope)({ inputId, sessionId }).pipe(
			Effect.andThen(inputs.mark(inputId, "queued_for_wake")),
			Effect.as<SessionSendReceipt>("queued_for_wake"),
		);
		const capacity = yield* capacities.current(session.backend);
		if (capacity.status === "blocked" || !(yield* fabric.holds(sessionId))) {
			return yield* queued;
		}
		const afterHandoff = recovery.awaken(sessionId).pipe(
			Effect.andThen(inputs.mark(inputId, "accepted")),
			Effect.as<SessionSendReceipt>("accepted"),
			// A failure after provider acceptance makes retry safety unknowable.
			Effect.tapError(() => inputs.mark(inputId, "ambiguous")),
		);
		return yield* fabric.send(sessionId, input).pipe(
			Effect.andThen(afterHandoff),
			Effect.tapErrorTag("BackendFailure", () => inputs.mark(inputId, "ambiguous")),
			// An attachment may detach after `holds`; the same input then follows the wake path.
			Effect.catchTag("SessionNotLive", () => queued),
		);
	});
