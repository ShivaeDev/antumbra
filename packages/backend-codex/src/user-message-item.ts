import type {
	AgentEvent,
	RawPayload,
} from "@antumbra/vocabulary/session-events";
import { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Option, Schema } from "effect";
import type { KnownItem } from "#protocol-items.ts";

type UserMessage = Extract<KnownItem, { type: "userMessage" }>;
const decodeInputId = Schema.decodeUnknownOption(SessionInputId);

export const userMessageEvent = (
	item: UserMessage,
	raw: RawPayload,
): AgentEvent => {
	const inputId = Option.flatMap(
		Option.fromNullishOr(item.clientId),
		decodeInputId,
	);
	return {
		...(Option.isNone(inputId) ? {} : { inputId: inputId.value }),
		parts: item.content.map((part, position) =>
			part.type === "text"
				? { text: part.text, type: "text" as const }
				: { position, type: "image" as const },
		),
		raw,
		role: "user",
		text: item.content
			.flatMap((part) => (part.type === "text" ? [part.text] : []))
			.join("\n"),
		type: "message",
	};
};
