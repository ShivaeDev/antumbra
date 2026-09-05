import { type RulingAgentView, RulingView, type StandingRulingView } from "@antumbra/contract";
import { whenLabel } from "#voyages/labels.ts";
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

export const rulingActorLabel = (by: Authority, agent: RulingAgentView | null): string =>
	by === "captain" && agent !== null ? `the ${agent.role}` : rulingAuthorityLabel[by];

const RUNG_LABEL: Readonly<Record<"admiral" | "flagship", string>> = {
	admiral: "Waits on you",
	flagship: "Waits on the flagship",
};

const rulingRungLabel = (rung: Rung): string => (rung.kind === "captain" ? `Waits on the captain of ${rung.voyageName}` : RUNG_LABEL[rung.kind]);

export const rulingWaitsLabel = (ruling: RulingView): string => `${rulingRungLabel(ruling.rung)}. ${rulingRadiusLabel[ruling.radius]}.`;

export const rulingRequesterLabel = (requester: Requester): string =>
	requester.kind === "authority" ? rulingAuthorityLabel[requester.by] : `the ${requester.agent.role}`;

export const rulingRequesterId = (requester: Requester): string | undefined => (requester.kind === "agent" ? requester.agent.id : undefined);

const askedOf = (ruling: RulingView): string => {
	const piece = ruling.subjects.find((subject) => subject.kind === "piece");
	const asker = `Asked by ${rulingRequesterLabel(ruling.requester)}`;
	return piece === undefined ? asker : `${asker} on ${rulingSubjectLabel.piece} “${piece.label}”`;
};

export const rulingAskedLabel = (ruling: RulingView): string =>
	`${[askedOf(ruling), ...(ruling.voyage === null ? [] : [ruling.voyage.name]), whenLabel(ruling.requestedAt)].join(", ")}.`;

export const rulingGatedPieceLabel = (piece: GatedPiece): string => `${piece.title} (${piece.voyageName})`;

export const rulingContextAuthorLabel = (context: Context): string => (context.author === null ? "the admiral" : `the ${context.author.role}`);
