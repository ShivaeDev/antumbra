import type { RulingAuthority, RulingRadius, RulingSubjectKind, RulingUrgency } from "@antumbra/vocabulary/ruling";
import type { Option } from "effect";
import type { RulingSupersession, RulingWithdrawal } from "#retirement.ts";

export interface RulingAxes {
	readonly radius: RulingRadius;
	readonly urgency: RulingUrgency;
}

export type RulingReferenceKind = Exclude<RulingSubjectKind, "tag">;

// why: scope is typed as subject plus radius, so a subject is either a row the
// fleet already knows or a bare word for a concept that has none. The same
// shape names a subject when a ruling is written and when precedent is read.
export type RulingSubject = { readonly id: string; readonly kind: RulingReferenceKind } | { readonly kind: "tag"; readonly tag: string };

// why: a ruling is requested by an agent or by an authority proclaiming a rule
// of its own — never both and never neither, so one value says which rather
// than two columns every reader has to reconcile.
export type RulingRequester = { readonly agentId: string; readonly kind: "agent" } | { readonly by: RulingAuthority; readonly kind: "authority" };

// why: a piece held by a ruling names the question that holds it, so the
// gate carries the question and no reader has to look the ruling up.
export interface RulingGate {
	readonly pieceId: string;
	readonly question: string;
	readonly rulingId: string;
}

// why: a reclassification appends beside the asker's declaration and never
// over it, so each carries who set which axis, when, and any words beside it.
// A row that moved neither axis is a rung passing the question up with what
// it knew, because reclassifying refuses to name no axis at all.
export interface RulingReclassification {
	readonly at: Date;
	readonly by: RulingAuthority;
	readonly byAgentId: Option.Option<string>;
	readonly note: Option.Option<string>;
	readonly radius: Option.Option<RulingRadius>;
	readonly urgency: Option.Option<RulingUrgency>;
}

export interface RulingChoice {
	readonly detail: string | null;
	readonly id: string;
	readonly label: string;
	readonly position: number;
}

export interface RulingAnswer {
	readonly at: Date;
	readonly by: RulingAuthority;
	readonly byAgentId: Option.Option<string>;
	readonly choiceId: Option.Option<string>;
	readonly text: string;
}

// why: the context, the question, and the answer are one record because an
// answer read apart from its question loses the scope that bounds it. The
// axes are the effective ones — the latest word an authority set on each,
// else what the asker declared — and the declaration stays beside them. The
// rung is the one authority the open question is owed to; a rule an authority
// wrote for itself was never owed to anybody and names none.
export interface Ruling {
	readonly answer: Option.Option<RulingAnswer>;
	readonly choices: ReadonlyArray<RulingChoice>;
	readonly context: string;
	readonly createdAt: Date;
	readonly declared: RulingAxes;
	readonly gatedPieceIds: ReadonlyArray<string>;
	readonly id: string;
	readonly question: string;
	readonly radius: RulingRadius;
	readonly reclassifications: ReadonlyArray<RulingReclassification>;
	readonly requester: RulingRequester;
	readonly rung: Option.Option<RulingAuthority>;
	readonly subjects: ReadonlyArray<RulingSubject>;
	readonly supersession: Option.Option<RulingSupersession>;
	readonly urgency: RulingUrgency;
	readonly withdrawal: Option.Option<RulingWithdrawal>;
}
