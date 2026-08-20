import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
	AgentEvent,
	Origin,
	RawPayload,
} from "@antumbra/vocabulary/session-events";
import { blockEvent, contentBlocks } from "#blocks.ts";
import { claudeRaw } from "#raw-payload.ts";
import { spilledPreview } from "#spills.ts";
import { openSubsessions } from "#subsessions.ts";

const rawOf = (message: SDKMessage): RawPayload => {
	const subtype =
		"subtype" in message && typeof message.subtype === "string"
			? `/${message.subtype}`
			: "";
	return claudeRaw(`${message.type}${subtype}`, message);
};

type ResultMessage = Extract<SDKMessage, { type: "result" }>;

// why: an interrupted turn reports is_error with terminal_reason
// aborted_streaming — that is the interrupted status, not a failure.
const turnStatus = (message: ResultMessage) => {
	if (message.terminal_reason === "aborted_streaming") {
		return "interrupted";
	}
	return message.is_error ? "failed" : "completed";
};

const resultEvents = (
	raw: RawPayload,
	message: ResultMessage,
): ReadonlyArray<AgentEvent> => {
	const status = turnStatus(message);
	const usage: AgentEvent = {
		costUsd: message.total_cost_usd,
		inputTokens: message.usage.input_tokens,
		outputTokens: message.usage.output_tokens,
		raw,
		type: "usage",
	};
	return [
		usage,
		{ durationMs: message.duration_ms, raw, status, type: "turn.completed" },
	];
};

// why: attribution rides the frame itself. parent_tool_use_id names the tool
// call that spawned the subsession this frame came from, and parent_agent_id
// the spawner when the spawner is a subsession too. Neither absent means the
// root session's own turn, so nothing is asserted about frames that predate
// the field or come from a provider that does not send it.
const originOf = (message: SDKMessage): Origin | undefined => {
	const spawnedBy =
		"parent_tool_use_id" in message &&
		typeof message.parent_tool_use_id === "string"
			? message.parent_tool_use_id
			: undefined;
	if (spawnedBy === undefined) {
		return undefined;
	}
	return "parent_agent_id" in message &&
		typeof message.parent_agent_id === "string"
		? { parentNode: message.parent_agent_id, spawnedBy }
		: { spawnedBy };
};

type ContentMessage = Extract<SDKMessage, { type: "assistant" | "user" }>;

const contentEvents = (
	raw: RawPayload,
	message: ContentMessage,
	lifecycle: ReadonlyArray<AgentEvent>,
): ReadonlyArray<AgentEvent> => {
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

export interface SessionMapping {
	readonly frame: (message: SDKMessage) => ReadonlyArray<AgentEvent>;
	readonly spawnerOf: (subsessionRef: string) => string | undefined;
}

// why: the domain's vocabulary is the contract; anything the SDK says that
// has no neutral shape still lands in the log as raw, never dropped. A mapping
// is opened per session because subsession lifecycle spans frames — everything
// else here is decided by the frame in hand.
export const openSessionMapping = (): SessionMapping => {
	const subsessions = openSubsessions();
	const frame = (message: SDKMessage): ReadonlyArray<AgentEvent> => {
		const raw = rawOf(message);
		if (message.type === "system" && message.subtype === "init") {
			return [{ nativeRef: message.session_id, raw, type: "session.opened" }];
		}
		// why: progress is telemetry, and a record that kept every tick of it
		// would drown the frames that say what happened. Estimates and running
		// totals are dropped; what a progress frame names about the identity of
		// the work is read elsewhere, before the frame reaches here.
		if (
			message.type === "system" &&
			(message.subtype === "thinking_tokens" ||
				message.subtype === "task_progress")
		) {
			return [];
		}
		if (message.type === "result") {
			return resultEvents(raw, message);
		}
		const lifecycle = subsessions.events(raw, message);
		if (message.type === "assistant" || message.type === "user") {
			return contentEvents(raw, message, lifecycle);
		}
		return lifecycle.length === 0 ? [{ raw, type: "raw" }] : lifecycle;
	};
	return { frame, spawnerOf: subsessions.spawnerOf };
};
