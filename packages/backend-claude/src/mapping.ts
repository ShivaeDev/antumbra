import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin, RawPayload } from "@antumbra/vocabulary/session-events.ts";
import { blockEvent, contentBlocks } from "#blocks.ts";
import { rateLimitEvent } from "#rate-limits.ts";
import { rawOf } from "#raw-payload.ts";
import { systemEvents } from "#session-state.ts";
import { spilledPreview } from "#spills.ts";
import { openSubsessions } from "#subsessions.ts";
import { openTurnUsage } from "#turn-usage.ts";

type ResultMessage = Extract<SDKMessage, { type: "result" }>;

// Claude reports an interrupted turn as `is_error` with terminal reason `aborted_streaming`.
const turnStatus = (message: ResultMessage) => {
	if (message.terminal_reason === "aborted_streaming") {
		return "interrupted";
	}
	return message.is_error ? "failed" : "completed";
};

// Live nested frames include the spawning tool call and, below depth one, an undocumented `parent_agent_id`.
const originOf = (message: SDKMessage): Origin | undefined => {
	const spawnedBy = "parent_tool_use_id" in message && typeof message.parent_tool_use_id === "string" ? message.parent_tool_use_id : undefined;
	if (spawnedBy === undefined) {
		return undefined;
	}
	return "parent_agent_id" in message && typeof message.parent_agent_id === "string"
		? { parentNode: message.parent_agent_id, spawnedBy }
		: { spawnedBy };
};

type ContentMessage = Extract<SDKMessage, { type: "assistant" | "user" }>;

const contentEvents = (raw: RawPayload, message: ContentMessage, lifecycle: ReadonlyArray<AgentEvent>): ReadonlyArray<AgentEvent> => {
	const role = message.type === "assistant" ? "agent" : "user";
	const origin = originOf(message);
	const events = [
		...contentBlocks(message)
			.map((block) => blockEvent(raw, role, block, origin))
			.filter((event): event is AgentEvent => event !== undefined),
		...spilledPreview(raw, message, origin),
		...lifecycle,
	];
	return events.length === 0 ? [{ raw, type: "raw" }] : events;
};

interface SessionMapping {
	readonly frame: (message: SDKMessage) => ReadonlyArray<AgentEvent>;
	readonly spawnerOf: (subsessionRef: string) => string | undefined;
}

export const openSessionMapping = (): SessionMapping => {
	const subsessions = openSubsessions();
	const turns = openTurnUsage();
	const frame = (message: SDKMessage): ReadonlyArray<AgentEvent> => {
		const raw = rawOf(message);
		const system = message.type === "system" ? systemEvents(raw, message) : undefined;
		if (system !== undefined) {
			return system;
		}
		if (message.type === "rate_limit_event") {
			return [rateLimitEvent(raw, message)];
		}
		if (message.type === "result") {
			return [
				turns.usage(raw, message),
				{
					durationMs: message.duration_ms,
					raw,
					status: turnStatus(message),
					type: "turn.completed",
				},
			];
		}
		const lifecycle = subsessions.events(raw, message);
		if (message.type === "assistant" || message.type === "user") {
			return contentEvents(raw, message, lifecycle);
		}
		return lifecycle.length === 0 ? [{ raw, type: "raw" }] : lifecycle;
	};
	return { frame, spawnerOf: subsessions.spawnerOf };
};
