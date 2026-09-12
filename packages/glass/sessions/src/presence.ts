import type { SessionPresence } from "@antumbra/platform-vocabulary/agent-runtime/session-presence.ts";

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
