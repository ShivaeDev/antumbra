import type { PiMessage } from "#messages.ts";
import type { PiEvent } from "#runtime.ts";

type Assistant = Extract<PiMessage, { role: "assistant" }>;

export const usage = {
	cacheRead: 3,
	cacheWrite: 1,
	cost: { cacheRead: 0.01, cacheWrite: 0.02, input: 0.03, output: 0.04, total: 0.1 },
	input: 11,
	output: 5,
	totalTokens: 20,
};

export const assistant = (content: Assistant["content"], stopReason: Assistant["stopReason"] = "stop", errorMessage?: string): Assistant => ({
	api: "anthropic-messages",
	content,
	model: "claude-sonnet-4-5",
	provider: "anthropic",
	role: "assistant",
	stopReason,
	timestamp: 0,
	usage,
	...(errorMessage === undefined ? {} : { errorMessage }),
});

export const said = (text: string): PiEvent => ({ message: assistant([{ text, type: "text" }]), type: "message_end" });

export const asked = (text: string): PiEvent => ({
	message: { content: [{ text, type: "text" }], role: "user", timestamp: 0 },
	type: "message_end",
});

export const ended = (stopReason: Assistant["stopReason"], errorMessage?: string): PiEvent => ({
	messages: [assistant([{ text: "done", type: "text" }], stopReason, errorMessage)],
	type: "agent_end",
	willRetry: false,
});

export const retrying = (): PiEvent => ({
	messages: [assistant([{ text: "overloaded", type: "text" }], "error", "overloaded")],
	type: "agent_end",
	willRetry: true,
});

export const settled: PiEvent = { type: "agent_settled" };

export const toolStart = (toolName: string): PiEvent => ({
	args: { path: "README.md" },
	toolCallId: "call-1",
	toolName,
	type: "tool_execution_start",
});

export const toolEnd = (isError: boolean): PiEvent => ({
	isError,
	result: {
		content: [
			{ text: "first", type: "text" },
			{ text: "second", type: "text" },
		],
		details: undefined,
	},
	toolCallId: "call-1",
	toolName: "read",
	type: "tool_execution_end",
});
