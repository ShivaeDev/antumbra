import type { AgentEvent, RawPayload } from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";
import { rawEvent } from "#mapping.ts";
import type { MessageAuthor, MessageAuthors } from "#message-authors.ts";
import { KnownPart, PartUpdatedProperties } from "#protocol-parts.ts";
import { toolEvents } from "#tool-parts.ts";

const decodeProperties = Schema.decodeUnknownOption(PartUpdatedProperties);
const decodePart = Schema.decodeUnknownOption(KnownPart);

type Settled = Extract<KnownPart, { type: "reasoning" | "text" }>;

const isSettled = (part: Settled, author: MessageAuthor): boolean => author.role === "user" || part.time?.end !== undefined;

const spokenEvents = (raw: RawPayload, part: Settled, author: MessageAuthor): AgentEvent[] =>
	part.type === "reasoning" ? [{ raw, text: part.text, type: "thinking" }] : [{ raw, role: author.role, text: part.text, type: "message" }];

const usageEvents = (raw: RawPayload, part: Extract<KnownPart, { type: "step-finish" }>, author: MessageAuthor): AgentEvent[] => [
	{
		...(part.tokens.cache?.read === undefined ? {} : { cacheReadTokens: part.tokens.cache.read }),
		...(part.tokens.cache?.write === undefined ? {} : { cacheWriteTokens: part.tokens.cache.write }),
		...(part.cost === undefined ? {} : { costUsd: part.cost }),
		inputTokens: part.tokens.input,
		...(Option.isNone(author.model) ? {} : { model: author.model.value }),
		outputTokens: part.tokens.output,
		raw,
		type: "usage",
	},
];

const authoredEvents = (raw: RawPayload, part: KnownPart, author: MessageAuthor, firstReport: (key: string) => boolean): AgentEvent[] => {
	if (part.type === "tool") {
		return toolEvents(raw, part, (callId) => firstReport(`${part.state.status}:${callId}`));
	}
	if (part.type === "step-finish") {
		return firstReport(`part:${part.id}`) ? usageEvents(raw, part, author) : [];
	}
	return isSettled(part, author) && firstReport(`part:${part.id}`) ? spokenEvents(raw, part, author) : [];
};

export const partEvents = (raw: RawPayload, properties: unknown, authors: MessageAuthors, firstReport: (key: string) => boolean): AgentEvent[] =>
	Option.match(decodeProperties(properties), {
		onNone: () => rawEvent(raw),
		onSome: ({ part }) =>
			Option.match(decodePart(part), {
				onNone: () => rawEvent(raw),
				onSome: (known) =>
					Option.match(authors.of(known.messageID), {
						onNone: () => rawEvent(raw),
						onSome: (author) => authoredEvents(raw, known, author, firstReport),
					}),
			}),
	});
