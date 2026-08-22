import type { SessionPresence } from "@antumbra/vocabulary/agent-runtime";

// why: the four presences are said in plain English here and nowhere else, the
// way session-outcome-words.ts is the one home for how a delegated node ended.
// The chip is what a reader glances at; the note is what the send box says
// underneath, and it answers the only question the admiral is really asking —
// will this be read.
export const presenceWords: Record<SessionPresence, string> = {
	asleep: "asleep",
	ended: "ended",
	idle: "listening",
	working: "working",
};

export const presenceNote: Record<SessionPresence, string> = {
	asleep: "asleep — it will wake when you speak to it",
	ended: "this session has ended",
	idle: "listening, with nothing to do",
	working: "working",
};
