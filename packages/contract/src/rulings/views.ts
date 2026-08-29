import {
	RulingAuthoritySchema,
	RulingRadiusSchema,
	RulingSubjectKindSchema,
	RulingUrgencySchema,
} from "@antumbra/vocabulary/ruling";
import { Schema } from "effect";

// why: a choice is offered, never imposed — the window shows what the asker
// suggested and what it meant by it, and the answer may pick none of them.
export const RulingChoiceView = Schema.Struct({
	detail: Schema.NullOr(Schema.String),
	id: Schema.String,
	label: Schema.String,
});
export type RulingChoiceView = typeof RulingChoiceView.Type;

// why: scope reaches the window as words rather than as a row to join on —
// the kind says what is named and the label is the reference or the tag, so
// reading a ruling never sends the window looking for the subject's record.
export const RulingSubjectView = Schema.Struct({
	kind: RulingSubjectKindSchema,
	label: Schema.String,
});
export type RulingSubjectView = typeof RulingSubjectView.Type;

// why: a ruling is asked by an agent or proclaimed by an authority, and the
// window says which in its own words — the asker's id means nothing when the
// admiral wrote the question for itself.
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

// why: a reclassification is read beside the asker's declaration, so the
// window is told who set which axis, when, and any words beside it. The agent
// travels beside the rung, because one of many captains is not read off the
// rung alone; a row that moved neither axis is a rung passing the question up.
export const RulingReclassificationView = Schema.Struct({
	at: Schema.String,
	by: RulingAuthoritySchema,
	byAgentId: Schema.NullOr(Schema.String),
	note: Schema.optional(Schema.String),
	radius: Schema.optional(RulingRadiusSchema),
	urgency: Schema.optional(RulingUrgencySchema),
});
export type RulingReclassificationView = typeof RulingReclassificationView.Type;
// why: a ruling is prioritised by what it releases, so every piece it holds
// reaches the window by title and voyage rather than as an id to look up.
export const RulingGatedPieceView = Schema.Struct({
	pieceId: Schema.String,
	title: Schema.String,
	voyageId: Schema.String,
	voyageName: Schema.String,
});
export type RulingGatedPieceView = typeof RulingGatedPieceView.Type;

// why: a piece held by a ruling names the question that holds it, so a
// window can say what a blocked piece waits on without looking the id up.
export const AwaitingRulingView = Schema.Struct({
	question: Schema.String,
	rulingId: Schema.String,
});
export type AwaitingRulingView = typeof AwaitingRulingView.Type;

// why: an open ruling waits on exactly one rung, and the window says which in
// its own words. A captain rung names the voyage whose captain holds it,
// because "the captain" alone names no one in a fleet of them.
export const RulingRungView = Schema.Union([
	Schema.Struct({
		kind: Schema.Literal("captain"),
		voyageId: Schema.String,
		voyageName: Schema.String,
	}),
	Schema.Struct({ kind: Schema.Literals(["flagship", "admiral"]) }),
]);
export type RulingRungView = typeof RulingRungView.Type;

// why: the context, the question and the choices travel together because an
// answer read apart from its question loses the scope that bounds it. The
// axes are the effective ones; the declaration travels beside them.
export const RulingView = Schema.Struct({
	choices: Schema.Array(RulingChoiceView),
	context: Schema.String,
	declared: RulingAxesView,
	gatedPieces: Schema.Array(RulingGatedPieceView),
	id: Schema.String,
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

// why: the order is the domain's, not the window's — what holds an asker
// first, then what binds most widely, then what has waited longest.
export const OpenRulingsView = Schema.Struct({
	rulings: Schema.Array(RulingView),
});
export type OpenRulingsView = typeof OpenRulingsView.Type;

// why: a standing ruling reaches the window as what binds — the question, the
// answer read in its light, and who ruled when — rather than as the request it
// began as; the label of a picked choice travels so the pick reads as words.
// Staleness is derived where the work is known and travels as one word, so the
// window never joins a ruling's subjects against what became of them.
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

// why: newest first, so the latest word about a scope is the first one met.
export const StandingRulingsView = Schema.Struct({
	rulings: Schema.Array(StandingRulingView),
});
export type StandingRulingsView = typeof StandingRulingsView.Type;
