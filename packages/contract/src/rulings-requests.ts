import { Schema } from "effect";

// why: free text always stands beside a pick and never behind it. A choice is
// optional because a question may offer none and an authority may take none;
// the words are required because they are what a later reader is left with.
export const RuleRequest = Schema.Struct({
	answer: Schema.NonEmptyString,
	choiceId: Schema.optional(Schema.String),
	rulingId: Schema.String,
});
export type RuleRequest = typeof RuleRequest.Type;

export const RulingRuledReceipt = Schema.Struct({
	rulingId: Schema.String,
});
export type RulingRuledReceipt = typeof RulingRuledReceipt.Type;
