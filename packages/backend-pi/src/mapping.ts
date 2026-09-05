import type { AgentEvent, RawPayload } from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";
import { messageEvents } from "#messages.ts";
import type { PiEvent } from "#runtime.ts";

export const rawOf = (kind: string, payload: unknown): RawPayload => ({
	kind,
	payload: JSON.stringify(payload),
	source: "pi",
});

type Ended = Extract<PiEvent, { type: "agent_end" }>;
type ToolStarted = Extract<PiEvent, { type: "tool_execution_start" }>;
type ToolEnded = Extract<PiEvent, { type: "tool_execution_end" }>;

const ToolOutput = Schema.Struct({
	content: Schema.Array(Schema.Struct({ text: Schema.optional(Schema.String), type: Schema.String })),
});

const decodeOutput = Schema.decodeUnknownOption(ToolOutput);

const outputOf = (result: unknown): string =>
	Option.match(decodeOutput(result), {
		onNone: () => "",
		onSome: ({ content }) => content.flatMap((part) => (part.type === "text" && part.text !== undefined ? [part.text] : [])).join("\n"),
	});

const turnStatus = (stopReason: string | undefined): "completed" | "failed" | "interrupted" => {
	if (stopReason === "aborted") {
		return "interrupted";
	}
	return stopReason === "error" ? "failed" : "completed";
};

const turnEvents = (event: Ended): AgentEvent[] => {
	const ending = event.messages.filter((message) => message.role === "assistant").at(-1);
	const raw = rawOf("agent_end", ending === undefined ? {} : { errorMessage: ending.errorMessage, stopReason: ending.stopReason });
	return [
		{ raw, status: turnStatus(ending?.stopReason), type: "turn.completed" },
		{ raw, state: "idle", type: "session.state" },
	];
};

const toolStarted = (event: ToolStarted, served: ReadonlySet<string>): AgentEvent => ({
	input: JSON.stringify(event.args),
	name: event.toolName,
	raw: rawOf("tool_execution_start", { args: event.args, toolName: event.toolName }),
	...(served.has(event.toolName) ? { servedBy: "antumbra" } : {}),
	toolId: event.toolCallId,
	type: "tool.started",
});

const toolEnded = (event: ToolEnded): AgentEvent => ({
	ok: !event.isError,
	output: outputOf(event.result),
	raw: rawOf("tool_execution_end", { isError: event.isError, result: event.result, toolName: event.toolName }),
	toolId: event.toolCallId,
	type: "tool.completed",
});

export const toAgentEvents = (event: PiEvent, served: ReadonlySet<string>): AgentEvent[] => {
	switch (event.type) {
		case "agent_start":
			return [{ raw: rawOf("agent_start", {}), state: "running", type: "session.state" }];
		case "agent_end":
			return turnEvents(event);
		case "message_end":
			return messageEvents(event.message, rawOf("message_end", event.message));
		case "tool_execution_start":
			return [toolStarted(event, served)];
		case "tool_execution_end":
			return [toolEnded(event)];
		default:
			return [];
	}
};
