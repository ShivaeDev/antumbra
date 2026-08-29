import { RulingView, type StandingRulingView } from "@antumbra/contract";
import type { Tone } from "#voyages/tone.ts";

type GatedPiece = RulingView["gatedPieces"][number];
type Radius = RulingView["radius"];
type Rung = RulingView["rung"];
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
	captain: "a captain",
	flagship: "the flagship",
};

// why: a captain is one of many, so an answer or a move it made is read as the
// agent that made it; the flagship and the admiral are each one office.
export const rulingActorLabel = (
	by: Authority,
	agentId: string | null,
): string =>
	by === "captain" && agentId !== null
		? `captain ${agentId}`
		: rulingAuthorityLabel[by];

const RUNG_LABEL: Readonly<Record<"admiral" | "flagship", string>> = {
	admiral: "waits on you",
	flagship: "waits on the flagship",
};

// why: an open ruling is met by the admiral beside what it is still owed to,
// so the window says whose turn it is — and names the ship when the turn
// belongs to a captain, since "the captain" alone names nobody.
export const rulingRungLabel = (rung: Rung): string =>
	rung.kind === "captain"
		? `waits on the captain of ${rung.voyageName}`
		: RUNG_LABEL[rung.kind];

// why: who asked is read as words: an authority that wrote a rule for itself
// names itself, and an agent is named by the id the fleet knows it by.
export const rulingRequesterLabel = (requester: Requester): string =>
	requester.kind === "authority"
		? `asked by ${rulingAuthorityLabel[requester.by]}`
		: requester.agentId;

export const rulingGatedPieceLabel = (piece: GatedPiece): string =>
	`${piece.title} (${piece.voyageName})`;
