import type { SessionStore } from "@anthropic-ai/claude-agent-sdk";
import type { MirrorWrite } from "#session-lanes.ts";

// why: the provider offers a second copy of everything it writes to its own
// transcripts, and it is the only copy that carries a workflow's agents — they
// say nothing at all on the stream. Every batch is handed straight to the lane
// that maps it; this adapter keeps nothing, because what it is worth keeping is
// already the Session's own event log.
//
// load answers null on purpose. This is a mirror, not a source: a store that
// cannot serve a transcript back must say so, and the provider then resumes
// from its own local copy exactly as it does with no store at all. Claiming to
// hold one and returning an empty answer would resume the session into silence.
// listSubkeys and listSessions are absent for the same reason.
export const mirroringSessionStore = (mirror: (write: MirrorWrite) => void): SessionStore => ({
	append: async (key, entries) => {
		mirror({ entries, key });
	},
	load: async () => null,
});
