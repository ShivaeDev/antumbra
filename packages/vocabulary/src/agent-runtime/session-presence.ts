import { Schema } from "effect";

// why: the five ways a Session can be present to the admiral, derived from the
// record and this process together rather than stored. "idle", "asleep" and
// "stranded" all read as quiet from outside, and the differences — whether
// anything is still listening, and whether the work it was doing ever finished
// — are what decide whether words are handed over, wake something, or are the
// only thing that will ever pick the work back up. So they are published rather
// than left to be guessed from execution state.
export const SessionPresenceSchema = Schema.Literals(["working", "idle", "asleep", "stranded", "ended"]);
export type SessionPresence = typeof SessionPresenceSchema.Type;

export const sessionPresence = (input: {
	readonly attached: boolean;
	readonly executionStatus: "active" | "draining" | "idle";
	readonly open: boolean;
}): SessionPresence => {
	if (!input.open) {
		return "ended";
	}
	// why: an attachment is what listening is made of. Without one, a row still
	// saying "active" has outlived the process that made it true and the turn it
	// was taking ended with nobody there — that is stranding, and it is a
	// different fact from a Session that was rested on purpose. Nothing goes and
	// fetches a stranded Session back; a send or a hail is what does.
	if (!input.attached) {
		return input.executionStatus === "active" ? "stranded" : "asleep";
	}
	if (input.executionStatus === "active") {
		return "working";
	}
	// why: draining is a Session on its way out of this process, so the reading
	// that is still true a moment later is the one to publish.
	return input.executionStatus === "idle" ? "idle" : "asleep";
};
