import { Schema } from "effect";

// why: the four ways a Session can be present to the admiral, derived from the
// record and this process together rather than stored. "idle" and "asleep"
// both read as quiet from outside, and the difference — whether anything is
// still listening — is exactly what decides whether words are handed over or
// have to wake something first, so it is published rather than left to be
// guessed from execution state.
export const SessionPresenceSchema = Schema.Literals([
	"working",
	"idle",
	"asleep",
	"ended",
]);
export type SessionPresence = typeof SessionPresenceSchema.Type;

export const sessionPresence = (input: {
	readonly attached: boolean;
	readonly executionStatus: "active" | "draining" | "idle";
	readonly open: boolean;
}): SessionPresence => {
	if (!input.open) {
		return "ended";
	}
	// why: an attachment is what listening is made of. Without one the Session
	// is asleep whatever the row last recorded, because a row still saying
	// "active" has outlived the process that made it true.
	if (!input.attached) {
		return "asleep";
	}
	if (input.executionStatus === "active") {
		return "working";
	}
	// why: draining is a Session on its way out of this process, so the reading
	// that is still true a moment later is the one to publish.
	return input.executionStatus === "idle" ? "idle" : "asleep";
};
