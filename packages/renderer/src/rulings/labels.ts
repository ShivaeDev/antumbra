import type { RulingView } from "@antumbra/contract";
import type { Tone } from "#voyages/tone.ts";

type Radius = RulingView["radius"];
type SubjectKind = RulingView["subjects"][number]["kind"];
type Urgency = RulingView["urgency"];

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

export const rulingSubjectLabel: Readonly<Record<SubjectKind, string>> = {
	agent: "Agent",
	piece: "Piece",
	repo: "Repository",
	tag: "Tag",
	voyage: "Voyage",
};
