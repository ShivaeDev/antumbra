import { RulingView, type StandingRulingView } from "@antumbra/contract";
import type { Tone } from "#voyages/tone.ts";

type GatedPiece = RulingView["gatedPieces"][number];
type Radius = RulingView["radius"];
type SubjectKind = RulingView["subjects"][number]["kind"];
type Urgency = RulingView["urgency"];
type Authority = StandingRulingView["ruledBy"];
type Requester = RulingView["requester"];

// why: every word the record can publish is named here in the register the
// window speaks, so a new one is a compile error rather than a wire spelling
// leaking onto a badge.
export const rulingUrgencyLabel: Readonly<Record<Urgency, string>> = {
	blocking: "Holding the asker",
	eventual: "Wanted someday",
	pressing: "Work waits on it",
};

// why: urgency is the only axis that says anything is stopped, so it carries
// the colour; radius says how far the answer reaches and only names itself.
export const rulingUrgencyTone: Readonly<Record<Urgency, Tone>> = {
	blocking: "warning",
	eventual: "outline",
	pressing: "info",
};

export const rulingRadiusLabel: Readonly<Record<Radius, string>> = {
	fleet: "Binds the fleet",
	piece: "Binds one piece",
	voyage: "Binds the voyage",
};

// why: the words an authority may set an axis to are the IDL's own, read off
// the view's schema so the control offers exactly what the record accepts.
export const rulingRadii = RulingView.fields.radius.literals;
export const rulingUrgencies = RulingView.fields.urgency.literals;

export const rulingSubjectLabel: Readonly<Record<SubjectKind, string>> = {
	agent: "Agent",
	piece: "Piece",
	repo: "Repository",
	tag: "Tag",
	voyage: "Voyage",
};

export const rulingAuthorityLabel: Readonly<Record<Authority, string>> = {
	admiral: "the admiral",
};

// why: who asked is read as words: an authority that wrote a rule for itself
// names itself, and an agent is named by the id the fleet knows it by.
export const rulingRequesterLabel = (requester: Requester): string =>
	requester.kind === "authority"
		? `asked by ${rulingAuthorityLabel[requester.by]}`
		: requester.agentId;

export const rulingGatedPieceLabel = (piece: GatedPiece): string =>
	`${piece.title} (${piece.voyageName})`;
