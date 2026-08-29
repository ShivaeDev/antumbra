import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";
import { Raw } from "#session-events/raw.ts";

// why: a provider whose delegated threads report their own spend and their own
// turn endings says so on the same stream as the session's, so these carry the
// same attribution the words do. Absent, as everywhere else, means the session's
// own turn.
//
// why: input tokens are split four ways because that is the split that decides
// what a turn costs. Fresh input, a cache read and a cache write are billed at
// three different rates, and a resume that hit the cache is invisible in a
// single input number — which is the whole question a reader has when a long
// session picks back up. Both cache fields are optional because a provider may
// not say; absent means unreported, never zero.
//
// why: two costs, because the providers report two different things.
// `costUsd` is what this turn cost. `cumulativeCostUsd` is the running total
// the provider carries for the whole conversation — claude sends only that
// one, so the turn's share is the step it took since the last usage frame.
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
