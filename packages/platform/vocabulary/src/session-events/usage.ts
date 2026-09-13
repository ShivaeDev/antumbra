import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";
import { Raw } from "#session-events/raw.ts";

// Providers may omit cache counts and cost; absence means unreported, not zero.
export const ModelUsage = Schema.Struct({
	cacheReadTokens: Schema.optional(Schema.Number),
	cacheWriteTokens: Schema.optional(Schema.Number),
	costUsd: Schema.optional(Schema.Number),
	inputTokens: Schema.Number,
	model: Schema.String,
	outputTokens: Schema.Number,
});
export type ModelUsage = typeof ModelUsage.Type;

// One event per turn: `byModel` names every model the turn ran on and the totals are its sums.
export const UsageEvent = Schema.Struct({
	byModel: Schema.Array(ModelUsage),
	cacheReadTokens: Schema.optional(Schema.Number),
	cacheWriteTokens: Schema.optional(Schema.Number),
	costUsd: Schema.optional(Schema.Number),
	cumulativeCostUsd: Schema.optional(Schema.Number),
	inputTokens: Schema.Number,
	origin: Schema.optional(Origin),
	outputTokens: Schema.Number,
	raw: Raw,
	type: Schema.Literal("usage"),
});

export const ModelReroutedEvent = Schema.Struct({
	model: Schema.String,
	origin: Schema.optional(Origin),
	raw: Raw,
	reason: Schema.String,
	type: Schema.Literal("model.rerouted"),
});
