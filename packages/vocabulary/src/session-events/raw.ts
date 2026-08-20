import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";

// why: `raw` carries the provider payload verbatim on every event so the log
// stays the wire truth while consumers stay backend-blind. A payload no member
// gives a neutral shape to is still evidence, so it lands as its own event
// rather than being dropped.
export const Raw = Schema.Struct({
	kind: Schema.String,
	payload: Schema.String,
	source: Schema.String,
});
export type RawPayload = typeof Raw.Type;

// why: a payload with no neutral shape is still the work of whoever produced
// it, and a provider that broadcasts its tree sends plenty of them from nodes.
// Without the attribution the frame carried, the log would file a node's
// unmodelled words under the session that merely happened to be listening.
export const RawEvent = Schema.Struct({
	origin: Schema.optional(Origin),
	raw: Raw,
	type: Schema.Literal("raw"),
});
