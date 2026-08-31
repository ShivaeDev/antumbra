import type { SessionStore } from "@anthropic-ai/claude-agent-sdk";
import type { MirrorWrite } from "#session-lanes.ts";

// A null load makes Claude resume from its local transcript. An empty load would claim the transcript exists but contains no messages.
export const mirroringSessionStore = (mirror: (write: MirrorWrite) => void): SessionStore => ({
	append: async (key, entries) => {
		mirror({ entries, key });
	},
	load: async () => null,
});
