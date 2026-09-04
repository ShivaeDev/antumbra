import {
	RulingAuthoritySchema,
	RulingKindSchema,
	RulingRadiusSchema,
	RulingSubjectKindSchema,
	RulingUrgencySchema,
} from "@antumbra/vocabulary/ruling";
import { Schema } from "effect";

export const RulingChoiceView = Schema.Struct({
	detail: Schema.NullOr(Schema.String),
	id: Schema.String,
	label: Schema.String,
});
export type RulingChoiceView = typeof RulingChoiceView.Type;

export const RulingSubjectView = Schema.Struct({
	kind: RulingSubjectKindSchema,
	label: Schema.String,
});
export type RulingSubjectView = typeof RulingSubjectView.Type;

export const RulingRequesterView = Schema.Union([
	Schema.Struct({ agentId: Schema.String, kind: Schema.Literal("agent") }),
	Schema.Struct({
		by: RulingAuthoritySchema,
		kind: Schema.Literal("authority"),
	}),
]);
export type RulingRequesterView = typeof RulingRequesterView.Type;

export const RulingAxesView = Schema.Struct({
	radius: RulingRadiusSchema,
	urgency: RulingUrgencySchema,
});
export type RulingAxesView = typeof RulingAxesView.Type;

export const RulingReclassificationView = Schema.Struct({
	at: Schema.String,
	by: RulingAuthoritySchema,
	byAgentId: Schema.NullOr(Schema.String),
	note: Schema.optional(Schema.String),
	radius: Schema.optional(RulingRadiusSchema),
	urgency: Schema.optional(RulingUrgencySchema),
});
export type RulingReclassificationView = typeof RulingReclassificationView.Type;
export const RulingGatedPieceView = Schema.Struct({
	pieceId: Schema.String,
	title: Schema.String,
	voyageId: Schema.String,
	voyageName: Schema.String,
});
export type RulingGatedPieceView = typeof RulingGatedPieceView.Type;

export const RulingApprovedPieceView = Schema.Struct({
	pieceId: Schema.String,
	title: Schema.String,
});
export type RulingApprovedPieceView = typeof RulingApprovedPieceView.Type;

export const AwaitingRulingView = Schema.Struct({
	question: Schema.String,
	rulingId: Schema.String,
});
export type AwaitingRulingView = typeof AwaitingRulingView.Type;

export const RulingRungView = Schema.Union([
	Schema.Struct({
		kind: Schema.Literal("captain"),
		voyageId: Schema.String,
		voyageName: Schema.String,
	}),
	Schema.Struct({ kind: Schema.Literals(["flagship", "admiral"]) }),
]);
export type RulingRungView = typeof RulingRungView.Type;

export const RulingView = Schema.Struct({
	approvedPieces: Schema.Array(RulingApprovedPieceView),
	choices: Schema.Array(RulingChoiceView),
	context: Schema.String,
	declared: RulingAxesView,
	gatedPieces: Schema.Array(RulingGatedPieceView),
	id: Schema.String,
	kind: RulingKindSchema,
	question: Schema.String,
	radius: RulingRadiusSchema,
	reclassifications: Schema.Array(RulingReclassificationView),
	requestedAt: Schema.String,
	requester: RulingRequesterView,
	rung: RulingRungView,
	subjects: Schema.Array(RulingSubjectView),
	urgency: RulingUrgencySchema,
});
export type RulingView = typeof RulingView.Type;

export const OpenRulingsView = Schema.Struct({
	rulings: Schema.Array(RulingView),
});
export type OpenRulingsView = typeof OpenRulingsView.Type;

export const StandingRulingView = Schema.Struct({
	answer: Schema.String,
	chosen: Schema.NullOr(Schema.String),
	id: Schema.String,
	question: Schema.String,
	radius: RulingRadiusSchema,
	ruledAt: Schema.String,
	ruledBy: RulingAuthoritySchema,
	ruledByAgentId: Schema.NullOr(Schema.String),
	stale: Schema.Boolean,
	subjects: Schema.Array(RulingSubjectView),
	urgency: RulingUrgencySchema,
});
export type StandingRulingView = typeof StandingRulingView.Type;

export const StandingRulingsView = Schema.Struct({
	rulings: Schema.Array(StandingRulingView),
});
export type StandingRulingsView = typeof StandingRulingsView.Type;
