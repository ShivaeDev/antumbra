import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";

const RawEvidence = Schema.Struct({
	byteSize: Schema.Number,
	digest: Schema.String,
	storage: Schema.Literal("local-cas"),
});

// why: `raw` carries the provider payload verbatim while it is small and safe
// to inline. Image-bearing or large evidence instead names its exact local CAS
// bytes so paths/base64 do not flow through SQLite and every transcript feed.
// A payload no member gives a neutral shape to still lands rather than being
// dropped.
export const Raw = Schema.Struct({
	evidence: Schema.optional(RawEvidence),
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
