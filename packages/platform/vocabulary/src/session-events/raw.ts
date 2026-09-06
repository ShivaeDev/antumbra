import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";

// Retain provider payloads verbatim so unknown events remain historical evidence.
export const Raw = Schema.Struct({
	kind: Schema.String,
	payload: Schema.String,
	source: Schema.String,
});
export type RawPayload = typeof Raw.Type;

export const RawEvent = Schema.Struct({
	origin: Schema.optional(Origin),
	raw: Raw,
	type: Schema.Literal("raw"),
});
