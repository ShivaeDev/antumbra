import type { SessionSummary } from "@antumbra/contract";

type SessionPresence = SessionSummary["presence"];

export const presenceWords: Record<SessionPresence, string> = {
	asleep: "asleep",
	ended: "ended",
	idle: "listening",
	stranded: "stranded",
	working: "working",
};

export const presenceNote: Record<SessionPresence, string> = {
	asleep: "asleep — it will wake when you speak to it",
	ended: "this session has ended",
	idle: "listening, with nothing to do",
	stranded: "stranded — its process is gone and its work was never finished; speak to it to take it back up",
	working: "working",
};

export const wakeNote: Record<"parked" | "underway", string> = {
	parked: "a wake is parked — the words it carries are still waiting to land",
	underway: "waking — the words it carries land when it does",
};

export const wakeReason = (detail: string | null): string | undefined => (detail === null || detail.trim() === "" ? undefined : detail);
