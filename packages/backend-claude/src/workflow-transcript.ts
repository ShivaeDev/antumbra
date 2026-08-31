import type { SessionMessage, SessionStoreEntry } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";
import { blockEvent, contentBlocks } from "#blocks.ts";
import { claudeRaw } from "#raw-payload.ts";

const ROLES = { assistant: "agent", user: "user" } as const;

const roleOf = (type: string): "agent" | "user" | undefined => (type === "assistant" || type === "user" ? ROLES[type] : undefined);

export const transcriptEvents = (entry: SessionStoreEntry | SessionMessage, origin: Origin): ReadonlyArray<AgentEvent> => {
	const raw = claudeRaw(`transcript/${entry.type}`, entry);
	const role = roleOf(entry.type);
	if (role === undefined) {
		return [{ raw, type: "raw" }];
	}
	const events = contentBlocks(entry)
		.map((block) => blockEvent(raw, role, block, origin))
		.filter((event): event is AgentEvent => event !== undefined);
	return events.length === 0 ? [{ raw, type: "raw" }] : events;
};
