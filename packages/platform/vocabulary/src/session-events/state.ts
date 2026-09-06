import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";
import { Raw } from "#session-events/raw.ts";

// Claude and Codex use different wire status values; both map to this vocabulary.
export const SessionState = Schema.Literals(["awaiting-input", "idle", "running"]);
export type SessionState = typeof SessionState.Type;

export const SessionStateEvent = Schema.Struct({
	origin: Schema.optional(Origin),
	raw: Raw,
	state: SessionState,
	type: Schema.Literal("session.state"),
});

// Background-task events replace the provider's complete live set.
export const BackgroundTask = Schema.Struct({
	description: Schema.String,
	id: Schema.String,
	kind: Schema.String,
});
export type BackgroundTask = typeof BackgroundTask.Type;

export const SessionBackgroundEvent = Schema.Struct({
	origin: Schema.optional(Origin),
	raw: Raw,
	tasks: Schema.Array(BackgroundTask),
	type: Schema.Literal("session.background"),
});
