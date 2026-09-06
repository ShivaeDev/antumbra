import { Option, Schema } from "effect";
import { AgentEvent } from "#session-events/events.ts";

const KnownAgentEvent = Schema.TaggedStruct("Known", {
	event: AgentEvent,
});

const UnknownAgentEvent = Schema.TaggedStruct("Unknown", {
	kind: Schema.String,
	payload: Schema.String,
});

export const HistoricalAgentEvent = Schema.Union([KnownAgentEvent, UnknownAgentEvent]);
export type HistoricalAgentEvent = typeof HistoricalAgentEvent.Type;

const decodeStoredPayload = Schema.decodeUnknownOption(Schema.fromJsonString(AgentEvent));

// Preserve stored payload bytes when the row kind or event schema is unknown.
export const projectHistoricalAgentEvent = (kind: string, payload: string): HistoricalAgentEvent => {
	const decoded = decodeStoredPayload(payload);
	return Option.isSome(decoded) && decoded.value.type === kind
		? KnownAgentEvent.make({ event: decoded.value })
		: UnknownAgentEvent.make({ kind, payload });
};
