import { Option, Schema } from "effect";
import { AgentEvent } from "#session-events/events.ts";

export const KnownAgentEvent = Schema.TaggedStruct("Known", {
	event: AgentEvent,
});
export type KnownAgentEvent = typeof KnownAgentEvent.Type;

export const UnknownAgentEvent = Schema.TaggedStruct("Unknown", {
	kind: Schema.String,
	payload: Schema.String,
});
export type UnknownAgentEvent = typeof UnknownAgentEvent.Type;

export const HistoricalAgentEvent = Schema.Union([
	KnownAgentEvent,
	UnknownAgentEvent,
]);
export type HistoricalAgentEvent = typeof HistoricalAgentEvent.Type;

const decodeStoredPayload = Schema.decodeUnknownOption(
	Schema.fromJsonString(AgentEvent),
);

// why: historical rows are evidence even when a newer writer or corruption
// makes them unknown here. Projection is total, preserves the exact bytes, and
// names Known only when both halves of the stored envelope agree.
export const projectHistoricalAgentEvent = (
	kind: string,
	payload: string,
): HistoricalAgentEvent => {
	const decoded = decodeStoredPayload(payload);
	return Option.isSome(decoded) && decoded.value.type === kind
		? KnownAgentEvent.make({ event: decoded.value })
		: UnknownAgentEvent.make({ kind, payload });
};
