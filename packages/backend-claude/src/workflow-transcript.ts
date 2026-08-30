import type { SessionMessage, SessionStoreEntry } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";
import { blockEvent, contentBlocks } from "#blocks.ts";
import { claudeRaw } from "#raw-payload.ts";

const ROLES = { assistant: "agent", user: "user" } as const;

const roleOf = (type: string): "agent" | "user" | undefined => (type === "assistant" || type === "user" ? ROLES[type] : undefined);

// why: a mirrored transcript line is the same conversation the stream carries,
// written the way the provider stores it rather than the way it forwards it, so
// its content blocks map through the one mapper this backend has. A line with
// no role — a summary, a title, a mode marker — has no neutral shape and lands
// as raw: this lane is the only record of a workflow agent's work, so nothing
// it receives is allowed to fall out of the log.
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
