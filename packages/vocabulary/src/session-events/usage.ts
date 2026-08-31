import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";
import { Raw } from "#session-events/raw.ts";

// Providers may omit cache counts and cumulative cost; absence means unreported, not zero.
export const UsageEvent = Schema.Struct({
	cacheReadTokens: Schema.optional(Schema.Number),
	cacheWriteTokens: Schema.optional(Schema.Number),
	costUsd: Schema.optional(Schema.Number),
	cumulativeCostUsd: Schema.optional(Schema.Number),
	inputTokens: Schema.Number,
	model: Schema.optional(Schema.String),
	origin: Schema.optional(Origin),
	outputTokens: Schema.Number,
	raw: Raw,
	type: Schema.Literal("usage"),
});
