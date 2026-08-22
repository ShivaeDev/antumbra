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

// why: speaking to an asleep Session asks for a wake, and what the box said a
// moment earlier — that it will wake when spoken to — stops being the news once
// the asking is under way. Until the wake lands, the words are with the wake
// and not with the Session, and the box that took them is the one place a
// reader will look to find that out.
export const wakeNote: Record<"parked" | "underway", string> = {
	parked: "a wake is parked — the words it carries are still waiting to land",
	underway: "waking — the words it carries land when it does",
};
