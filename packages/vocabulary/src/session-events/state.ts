import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";
import { Raw } from "#session-events/raw.ts";

// why: the harness's own word for what a session is doing, kept rather than
// thrown away. Claude sends `session_state_changed` with idle | running |
// requires_action and documents idle as the authoritative turn-over signal;
// codex sends `thread/status/changed` with idle | active, where an active
// thread carries waitingOnApproval / waitingOnUserInput flags, plus explicit
// `turn/started` and `turn/completed` edges. `awaiting-input` is the one both
// spell differently: claude's requires_action and codex's active-with-a-flag
// are the same fact — the turn is alive and stalled on somebody answering.
export const SessionState = Schema.Literals([
	"awaiting-input",
	"idle",
	"running",
]);
export type SessionState = typeof SessionState.Type;

export const SessionStateEvent = Schema.Struct({
	origin: Schema.optional(Origin),
	raw: Raw,
	state: SessionState,
	type: Schema.Literal("session.state"),
});

// why: no status field. The provider that sends this sends the whole live set
// on every membership change, so being in the set is the status — a task that
// stopped is simply absent from the next one. A field nothing fills would read
// as an unknown rather than as the fact that membership already says it.
export const BackgroundTask = Schema.Struct({
	description: Schema.String,
	id: Schema.String,
	kind: Schema.String,
});
export type BackgroundTask = typeof BackgroundTask.Type;

// why: replace semantics, because that is how the provider sends it. Pairing
// start/stop edges instead would wedge a stale task forever on one missed
// bookend, and the provider says so in as many words. An empty array is the
// honest answer for "nothing is running in the background", not a silence.
export const SessionBackgroundEvent = Schema.Struct({
	origin: Schema.optional(Origin),
	raw: Raw,
	tasks: Schema.Array(BackgroundTask),
	type: Schema.Literal("session.background"),
});
