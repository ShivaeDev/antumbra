import { RulingRadiusSchema, RulingUrgencySchema } from "@antumbra/vocabulary/ruling.ts";
import { Schema } from "effect";

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

export const AskMoreRequest = Schema.Struct({
	note: Schema.NonEmptyString,
	rulingId: Schema.String,
});
export type AskMoreRequest = typeof AskMoreRequest.Type;

export const RulingAskedMoreReceipt = Schema.Struct({
	rulingId: Schema.String,
});
export type RulingAskedMoreReceipt = typeof RulingAskedMoreReceipt.Type;

export const ParkRequest = Schema.Struct({
	note: Schema.NonEmptyString,
	rulingId: Schema.String,
});
export type ParkRequest = typeof ParkRequest.Type;

export const RulingParkedReceipt = Schema.Struct({
	rulingId: Schema.String,
});
export type RulingParkedReceipt = typeof RulingParkedReceipt.Type;

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

export const WithdrawRequest = Schema.Struct({
	note: Schema.NonEmptyString,
	rulingId: Schema.String,
});
export type WithdrawRequest = typeof WithdrawRequest.Type;

export const RulingWithdrawnReceipt = Schema.Struct({
	rulingId: Schema.String,
});
export type RulingWithdrawnReceipt = typeof RulingWithdrawnReceipt.Type;
