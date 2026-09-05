import { RulingView, type StandingRulingView } from "@antumbra/contract";
import type { Tone } from "#voyages/tone.ts";

type GatedPiece = RulingView["gatedPieces"][number];
type Radius = RulingView["radius"];
type Rung = RulingView["rung"];
type SubjectKind = RulingView["subjects"][number]["kind"];
type Urgency = RulingView["urgency"];
type Authority = StandingRulingView["ruledBy"];
type Requester = RulingView["requester"];
type Context = RulingView["contexts"][number];

export const rulingUrgencyLabel: Readonly<Record<Urgency, string>> = {
	blocking: "Holding the asker",
	eventual: "Wanted someday",
	pressing: "Work waits on it",
};

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

export const rulingActorLabel = (by: Authority, agentId: string | null): string =>
	by === "captain" && agentId !== null ? `captain ${agentId}` : rulingAuthorityLabel[by];

const RUNG_LABEL: Readonly<Record<"admiral" | "flagship", string>> = {
	admiral: "waits on you",
	flagship: "waits on the flagship",
};

export const rulingRungLabel = (rung: Rung): string =>
	rung.kind === "captain" ? `waits on the captain of ${rung.voyageName}` : RUNG_LABEL[rung.kind];

export const rulingRequesterLabel = (requester: Requester): string =>
	requester.kind === "authority" ? `asked by ${rulingAuthorityLabel[requester.by]}` : requester.agentId;

export const rulingGatedPieceLabel = (piece: GatedPiece): string => `${piece.title} (${piece.voyageName})`;

export const rulingContextAuthorLabel = (context: Context): string => context.authorAgentId ?? "the admiral";
