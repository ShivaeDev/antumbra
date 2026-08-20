import { Schema } from "effect";

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

export const RawEvent = Schema.Struct({
	raw: Raw,
	type: Schema.Literal("raw"),
});
