import type { SessionSummary } from "@antumbra/contract";

type SessionPresence = SessionSummary["presence"];

// why: the five presences are said in plain English here and nowhere else, the
// way session-outcome-words.ts is the one home for how a delegated node ended.
// The chip is what a reader glances at; the note is what the send box says
// underneath, and it answers the only question the admiral is really asking —
// will this be read.
export const presenceWords: Record<SessionPresence, string> = {
	asleep: "asleep",
	ended: "ended",
	idle: "listening",
	stranded: "stranded",
	working: "working",
};

// why: asleep and stranded are both quiet and both wake on being spoken to, and
// the note is where they stop reading alike. One was rested on purpose and has
// nothing left to do; the other lost its process mid-turn, so the work it was
// doing is still outstanding and nothing but the admiral will pick it back up.
export const presenceNote: Record<SessionPresence, string> = {
	asleep: "asleep — it will wake when you speak to it",
	ended: "this session has ended",
	idle: "listening, with nothing to do",
	stranded: "stranded — its process is gone and its work was never finished; speak to it to take it back up",
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

// why: the note says the wake is stuck; only the Intent's own sentence says
// what stopped it, and that sentence was reaching the database and stopping
// there. It goes out unedited, because a paraphrase of a durable reason is one
// more projection for a reader to distrust.
export const wakeReason = (detail: string | null): string | undefined => (detail === null || detail.trim() === "" ? undefined : detail);
