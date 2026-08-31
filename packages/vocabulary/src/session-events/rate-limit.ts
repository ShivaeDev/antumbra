import { Schema } from "effect";
import { Raw } from "#session-events/raw.ts";

export const RateLimitWindow = Schema.Struct({
	durationMinutes: Schema.optional(Schema.Number),
	model: Schema.optional(Schema.String),
	resetsAt: Schema.optional(Schema.Number),
	usedPercent: Schema.Number,
});

export const RateLimitEvent = Schema.Struct({
	raw: Raw,
	status: Schema.Literals(["allowed", "warning", "rejected", "unknown"]),
	type: Schema.Literal("rate.limit"),
	windows: Schema.Array(RateLimitWindow),
});
