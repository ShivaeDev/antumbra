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

// why: a ruling is prioritised by what it releases, so every piece it holds
// reaches the window by title and voyage rather than as an id to look up.
export const RulingGatedPieceView = Schema.Struct({
	pieceId: Schema.String,
	title: Schema.String,
	voyageId: Schema.String,
	voyageName: Schema.String,
});
export type RulingGatedPieceView = typeof RulingGatedPieceView.Type;

// why: the context, the question and the choices travel together because an
// answer read apart from its question loses the scope that bounds it.
export const RulingView = Schema.Struct({
	choices: Schema.Array(RulingChoiceView),
	context: Schema.String,
	gatedPieces: Schema.Array(RulingGatedPieceView),
	id: Schema.String,
	question: Schema.String,
	radius: RulingRadiusSchema,
	requestedAt: Schema.String,
	requesterAgentId: Schema.String,
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
export const StandingRulingView = Schema.Struct({
	answer: Schema.String,
	chosen: Schema.NullOr(Schema.String),
	id: Schema.String,
	question: Schema.String,
	radius: RulingRadiusSchema,
	ruledAt: Schema.String,
	ruledBy: RulingAuthoritySchema,
	subjects: Schema.Array(RulingSubjectView),
	urgency: RulingUrgencySchema,
});
export type StandingRulingView = typeof StandingRulingView.Type;

// why: newest first, so the latest word about a scope is the first one met.
export const StandingRulingsView = Schema.Struct({
	rulings: Schema.Array(StandingRulingView),
});
export type StandingRulingsView = typeof StandingRulingsView.Type;
