import { Schema } from "effect";

// A cost is null where nothing that ran reported one, and a floor where some of what ran did not.
export const SessionSpend = Schema.Struct({
	costPartial: Schema.Boolean,
	costUsd: Schema.NullOr(Schema.Number),
});
export type SessionSpend = typeof SessionSpend.Type;

export const SessionTokens = Schema.Struct({
	cacheReadTokens: Schema.Number,
	cacheWriteTokens: Schema.Number,
	inputTokens: Schema.Number,
	outputTokens: Schema.Number,
});
export type SessionTokens = typeof SessionTokens.Type;

export const SessionModelSpend = Schema.Struct({ ...SessionSpend.fields, ...SessionTokens.fields, model: Schema.String });
export type SessionModelSpend = typeof SessionModelSpend.Type;

export const SessionStanding = Schema.Struct({
	models: Schema.Array(SessionModelSpend),
	open: Schema.Array(Schema.Struct({ name: Schema.String })),
	rateLimit: Schema.optional(Schema.UndefinedOr(Schema.String)),
	spend: SessionSpend,
	tokens: SessionTokens,
	turn: SessionSpend,
});
export type SessionStanding = typeof SessionStanding.Type;
export const Activity = Schema.Struct({ live: Schema.Boolean, words: Schema.optional(Schema.UndefinedOr(Schema.String)) });
export type Activity = typeof Activity.Type;
