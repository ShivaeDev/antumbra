import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import type { TranscriptMessage } from "#transcript/model.ts";

type MessageEvent = Extract<AgentEvent, { type: "message" }>;

export const transcriptMessage = (event: MessageEvent, seq: number): TranscriptMessage => {
	const text = event.text.trim();
	return {
		inputId: event.inputId,
		kind: "message",
		parts:
			event.parts?.map((part) => (part.type === "text" ? { ...part, text: part.text.trim() } : part)) ??
			(text === "" ? [] : [{ text, type: "text" }]),
		role: event.role,
		seq,
		text,
	};
};
