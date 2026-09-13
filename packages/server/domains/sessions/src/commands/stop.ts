import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option, Schema } from "effect";
import { SessionId, SessionOperationId } from "#ids.ts";
import { session } from "#rows/session.ts";
import { sessionOperation } from "#rows/session-operation.ts";

export const sessionStopped = fact("SessionStopped", {
	id: SessionOperationId,
	sessionId: SessionId,
	reason: Schema.String,
	stoppedAt: Schema.String,
});

export const stop = command("stop", {
	input: { sessionId: SessionId, reason: Schema.String, requestedAt: Schema.String },
	reads: [session, sessionOperation],
	emits: sessionStopped,
	rejections: { Unavailable: { message: Schema.String }, Busy: { message: Schema.String } },
	run: Effect.fn("sessions.stop")(function* (input, rows, reject) {
		const found = yield* rows.session.find(input.sessionId);
		if (Option.isNone(found) || found.value.status !== "open" || found.value.parentSessionId !== null)
			return yield* reject.Unavailable({ message: "An open root session is required" });
		const root = found.value;
		const pending = yield* rows.sessionOperation.where({ sessionId: root.id, status: "requested" });
		if (pending.some((operation) => operation.kind === "interrupt" && operation.inputId === null))
			return yield* reject.Busy({ message: "This session operation is already requested" });
		return { id: SessionOperationId.make(input.requestId), sessionId: root.id, reason: input.reason, stoppedAt: input.requestedAt };
	}),
});

export const sessionStoppedMaterializer = materializer(sessionStopped, {
	writes: [session, sessionOperation],
	run: Effect.fn("sessions.SessionStopped")(function* (fact, rows) {
		yield* rows.sessionOperation.insert({
			id: fact.id,
			sessionId: fact.sessionId,
			kind: "interrupt",
			inputId: null,
			reason: fact.reason,
			status: "requested",
			detail: null,
			requestedAt: fact.stoppedAt,
			sequence: fact.seq,
			gatedBy: null,
		});
		yield* rows.session.update(fact.sessionId, { stoppedAt: fact.stoppedAt });
	}),
});
