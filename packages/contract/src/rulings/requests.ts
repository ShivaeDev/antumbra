import { RulingRadiusSchema, RulingUrgencySchema } from "@antumbra/vocabulary/ruling";
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

// why: an authority that wants a standing rule asks and answers one ruling at
// once, so a proclamation carries the whole record: the context that gives the
// answer its meaning, the question, both axes, and the words that settle it. A
// pick is named by the label it is written with, because no choice has an id
// until the proclamation lands.
export const ProclaimRequest = Schema.Struct({
	answer: Schema.NonEmptyString,
	choices: Schema.optional(
		Schema.Array(
			Schema.Struct({
				detail: Schema.optional(Schema.String),
				label: Schema.NonEmptyString,
			}),
		),
	),
	chosenChoice: Schema.optional(Schema.String),
	context: Schema.NonEmptyString,
	question: Schema.NonEmptyString,
	radius: RulingRadiusSchema,
	tags: Schema.optional(Schema.Array(Schema.NonEmptyString)),
	urgency: RulingUrgencySchema,
});
export type ProclaimRequest = typeof ProclaimRequest.Type;

export const RulingProclaimedReceipt = Schema.Struct({
	rulingId: Schema.String,
});
export type RulingProclaimedReceipt = typeof RulingProclaimedReceipt.Type;

// why: an authority may move either axis or both, and the words beside the
// move are optional — the record keeps who moved what, with or without them.
export const ReclassifyRequest = Schema.Struct({
	note: Schema.optional(Schema.String),
	radius: Schema.optional(RulingRadiusSchema),
	rulingId: Schema.String,
	urgency: Schema.optional(RulingUrgencySchema),
});
export type ReclassifyRequest = typeof ReclassifyRequest.Type;

export const RulingReclassifiedReceipt = Schema.Struct({
	rulingId: Schema.String,
});
export type RulingReclassifiedReceipt = typeof RulingReclassifiedReceipt.Type;

// why: superseding names two standing rulings and nothing else — the words
// that take over are already on the later ruling, so none travel here.
export const SupersedeRequest = Schema.Struct({
	byRulingId: Schema.String,
	rulingId: Schema.String,
});
export type SupersedeRequest = typeof SupersedeRequest.Type;

export const RulingSupersededReceipt = Schema.Struct({
	byRulingId: Schema.String,
	rulingId: Schema.String,
});
export type RulingSupersededReceipt = typeof RulingSupersededReceipt.Type;

// why: a withdrawal names no successor, so the note is the whole of what it
// leaves behind — the words a later reader gets instead of the ruling that
// would otherwise have taken over.
export const WithdrawRequest = Schema.Struct({
	note: Schema.NonEmptyString,
	rulingId: Schema.String,
});
export type WithdrawRequest = typeof WithdrawRequest.Type;

export const RulingWithdrawnReceipt = Schema.Struct({
	rulingId: Schema.String,
});
export type RulingWithdrawnReceipt = typeof RulingWithdrawnReceipt.Type;
