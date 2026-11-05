import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
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
});
