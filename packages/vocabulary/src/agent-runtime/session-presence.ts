import { Schema } from "effect";

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
	if (!input.attached) {
		return input.executionStatus === "active" ? "stranded" : "asleep";
	}
	if (input.executionStatus === "active") {
		return "working";
	}
	return input.executionStatus === "idle" ? "idle" : "asleep";
};
