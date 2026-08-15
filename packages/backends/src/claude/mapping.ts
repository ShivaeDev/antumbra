import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, RawPayload } from "@antumbra/session-events";
import { blockEvent, contentBlocks } from "#claude/blocks.ts";

const SOURCE = "claude";

const rawOf = (message: SDKMessage): RawPayload => {
	const subtype =
		"subtype" in message && typeof message.subtype === "string"
			? `/${message.subtype}`
			: "";
	return {
		kind: `${message.type}${subtype}`,
		payload: JSON.stringify(message),
		source: SOURCE,
	};
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

// why: the domain's vocabulary is the contract; anything the SDK says that
// has no neutral shape still lands in the log as raw, never dropped.
export const toAgentEvents = (
	message: SDKMessage,
): ReadonlyArray<AgentEvent> => {
	const raw = rawOf(message);
	if (message.type === "system" && message.subtype === "init") {
		return [{ nativeRef: message.session_id, raw, type: "session.opened" }];
	}
	if (message.type === "system" && message.subtype === "thinking_tokens") {
		return [];
	}
	if (message.type === "assistant" || message.type === "user") {
		const role = message.type === "assistant" ? "agent" : "user";
		const events = contentBlocks(message)
			.map((block) => blockEvent(raw, role, block))
			.filter((event): event is AgentEvent => event !== undefined);
		return events.length === 0 ? [{ raw, type: "raw" }] : events;
	}
	if (message.type === "result") {
		return resultEvents(raw, message);
	}
	return [{ raw, type: "raw" }];
};
