import type { AgentEvent, RawPayload } from "@antumbra/vocabulary/session-events";
import type { PiEvent } from "#runtime.ts";

export type PiMessage = Extract<PiEvent, { type: "message_end" }>["message"];
type Assistant = Extract<PiMessage, { role: "assistant" }>;
type User = Extract<PiMessage, { role: "user" }>;

const spoken = (content: Assistant["content"]): string => content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");

const reasoned = (content: Assistant["content"]): string => content.flatMap((part) => (part.type === "thinking" ? [part.thinking] : [])).join("\n");

const usage = (message: Assistant, raw: RawPayload): AgentEvent => ({
	cacheReadTokens: message.usage.cacheRead,
	cacheWriteTokens: message.usage.cacheWrite,
	costUsd: message.usage.cost.total,
	inputTokens: message.usage.input,
	model: message.model,
	outputTokens: message.usage.output,
	raw,
	type: "usage",
});

const assistantEvents = (message: Assistant, raw: RawPayload): AgentEvent[] => {
	const thinking = reasoned(message.content);
	const text = spoken(message.content);
	const events: AgentEvent[] = [];
	if (thinking !== "") {
		events.push({ raw, text: thinking, type: "thinking" });
	}
	if (text !== "") {
		events.push({ raw, role: "agent", text, type: "message" });
	}
	events.push(usage(message, raw));
	return events;
};

const asked = (content: User["content"]): string =>
	typeof content === "string" ? content : content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");

export const messageEvents = (message: PiMessage, raw: RawPayload): AgentEvent[] => {
	if (message.role === "assistant") {
		return assistantEvents(message, raw);
	}
	return message.role === "user" ? [{ raw, role: "user", text: asked(message.content), type: "message" }] : [];
};
