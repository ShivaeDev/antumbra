import type { AgentEvent, Origin, RawPayload } from "@antumbra/vocabulary/session-events.ts";
import { toolIdentity } from "#tool-names.ts";

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export const contentBlocks = (message: object): ReadonlyArray<Record<string, unknown>> => {
	if (!("message" in message) || !isRecord(message.message)) {
		return [];
	}
	const content = message.message.content;
	if (typeof content === "string") {
		return [{ text: content, type: "text" }];
	}
	return Array.isArray(content) ? content.filter(isRecord) : [];
};

export const textOf = (content: unknown): string => {
	if (typeof content === "string") {
		return content;
	}
	if (Array.isArray(content)) {
		return content
			.filter(isRecord)
			.map((block) => (typeof block.text === "string" ? block.text : ""))
			.join("");
	}
	return JSON.stringify(content);
};

export const blockEvent = (
	raw: RawPayload,
	role: "agent" | "user",
	block: Record<string, unknown>,
	origin: Origin | undefined,
): AgentEvent | undefined => {
	const from = origin === undefined ? {} : { origin };
	if (block.type === "text" && typeof block.text === "string") {
		return { ...from, raw, role, text: block.text, type: "message" };
	}
	if (block.type === "thinking" && typeof block.thinking === "string") {
		return { ...from, raw, text: block.thinking, type: "thinking" };
	}
	if (block.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string") {
		return {
			...from,
			input: JSON.stringify(block.input),
			...toolIdentity(block.name),
			raw,
			toolId: block.id,
			type: "tool.started",
		};
	}
	if (block.type === "tool_result" && typeof block.tool_use_id === "string") {
		return {
			...from,
			ok: block.is_error !== true,
			output: textOf(block.content),
			raw,
			toolId: block.tool_use_id,
			type: "tool.completed",
		};
	}
	return undefined;
};
