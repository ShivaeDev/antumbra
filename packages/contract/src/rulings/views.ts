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

export const RulingAxesView = Schema.Struct({
	radius: RulingRadiusSchema,
	urgency: RulingUrgencySchema,
});
export type RulingAxesView = typeof RulingAxesView.Type;

// why: a reclassification is read beside the asker's declaration, so the
// window is told who set which axis, when, and any words beside it.
export const RulingReclassificationView = Schema.Struct({
	at: Schema.String,
	by: RulingAuthoritySchema,
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
