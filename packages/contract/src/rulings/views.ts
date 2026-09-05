import { RulingAuthoritySchema, RulingRadiusSchema, RulingSubjectKindSchema, RulingUrgencySchema } from "@antumbra/vocabulary/ruling";
import { Schema } from "effect";

export const RulingChoiceView = Schema.Struct({
	detail: Schema.NullOr(Schema.String),
	id: Schema.String,
	label: Schema.String,
});
export type RulingChoiceView = typeof RulingChoiceView.Type;

export const RulingAgentView = Schema.Struct({
	id: Schema.String,
	role: Schema.String,
});
export type RulingAgentView = typeof RulingAgentView.Type;

export const RulingContextView = Schema.Struct({
	at: Schema.String,
	author: Schema.NullOr(RulingAgentView),
	body: Schema.String,
});
export type RulingContextView = typeof RulingContextView.Type;

export const RulingParkedView = Schema.Struct({
	at: Schema.String,
	note: Schema.String,
});
export type RulingParkedView = typeof RulingParkedView.Type;

export const RulingSubjectView = Schema.Struct({
	id: Schema.String,
	kind: RulingSubjectKindSchema,
	label: Schema.String,
});
export type RulingSubjectView = typeof RulingSubjectView.Type;

export const RulingRequesterView = Schema.Union([
	Schema.Struct({ agent: RulingAgentView, kind: Schema.Literal("agent") }),
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
	byAgent: Schema.NullOr(RulingAgentView),
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

export const AwaitingRulingView = Schema.Struct({
	question: Schema.String,
	rulingId: Schema.String,
});
export type AwaitingRulingView = typeof AwaitingRulingView.Type;

export const RulingRecommendationView = Schema.Struct({
	choiceId: Schema.String,
	reasoning: Schema.String,
});
export type RulingRecommendationView = typeof RulingRecommendationView.Type;

export const RulingVoyageView = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
});
export type RulingVoyageView = typeof RulingVoyageView.Type;

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
	choices: Schema.Array(RulingChoiceView),
	context: Schema.String,
	contexts: Schema.Array(RulingContextView),
	declared: RulingAxesView,
	gatedPieces: Schema.Array(RulingGatedPieceView),
	id: Schema.String,
	parked: Schema.NullOr(RulingParkedView),
	question: Schema.String,
	radius: RulingRadiusSchema,
	reclassifications: Schema.Array(RulingReclassificationView),
	recommendation: Schema.NullOr(RulingRecommendationView),
	requestedAt: Schema.String,
	requester: RulingRequesterView,
	rung: RulingRungView,
	subjects: Schema.Array(RulingSubjectView),
	urgency: RulingUrgencySchema,
	voyage: Schema.NullOr(RulingVoyageView),
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
	ruledByAgent: Schema.NullOr(RulingAgentView),
	stale: Schema.Boolean,
	subjects: Schema.Array(RulingSubjectView),
	urgency: RulingUrgencySchema,
});
export type StandingRulingView = typeof StandingRulingView.Type;

export const StandingRulingsView = Schema.Struct({
	rulings: Schema.Array(StandingRulingView),
});
export type StandingRulingsView = typeof StandingRulingsView.Type;
