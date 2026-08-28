import type {
	RulingAuthority,
	RulingRadius,
	RulingSubjectKind,
	RulingUrgency,
} from "@antumbra/vocabulary/ruling";
import type { Option } from "effect";

export interface RulingAxes {
	readonly radius: RulingRadius;
	readonly urgency: RulingUrgency;
}

export type RulingReferenceKind = Exclude<RulingSubjectKind, "tag">;

// why: scope is typed as subject plus radius, so a subject is either a row the
// fleet already knows or a bare word for a concept that has none. The same
// shape names a subject when a ruling is written and when precedent is read.
export type RulingSubject =
	| { readonly id: string; readonly kind: RulingReferenceKind }
	| { readonly kind: "tag"; readonly tag: string };

export interface RulingChoiceInput {
	readonly detail?: string;
	readonly label: string;
}

// why: the pieces a request holds are named in the same act as the question,
// so a hold never lands without the ruling that can release it.
export interface RulingRequest {
	readonly choices: ReadonlyArray<RulingChoiceInput>;
	readonly context: string;
	readonly gates: ReadonlyArray<string>;
	readonly question: string;
	readonly radius: RulingRadius;
	readonly requesterAgentId: string;
	readonly subjects: ReadonlyArray<RulingSubject>;
	readonly urgency: RulingUrgency;
}

export interface RulingGateInput {
	readonly pieceIds: ReadonlyArray<string>;
	readonly rulingId: string;
}

export interface RulingGate {
	readonly pieceId: string;
	readonly rulingId: string;
}

export interface RulingVerdict {
	readonly answer: string;
	readonly by: RulingAuthority;
	readonly choiceId?: string;
	readonly rulingId: string;
}

export interface RulingReclassifyInput {
	readonly by: RulingAuthority;
	readonly note?: string;
	readonly radius?: RulingRadius;
	readonly rulingId: string;
	readonly urgency?: RulingUrgency;
}

// why: a reclassification appends beside the asker's declaration and never
// over it, so each carries who set which axis, when, and any words beside it.
export interface RulingReclassification {
	readonly at: Date;
	readonly by: RulingAuthority;
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
	readonly choiceId: Option.Option<string>;
	readonly text: string;
}

// why: the context, the question, and the answer are one record because an
// answer read apart from its question loses the scope that bounds it. The
// axes are the effective ones — the latest word an authority set on each,
// else what the asker declared — and the declaration stays beside them.
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
	readonly requesterAgentId: string;
	readonly subjects: ReadonlyArray<RulingSubject>;
	readonly urgency: RulingUrgency;
}

export interface StoredRuling {
	readonly answer: string | null;
	readonly answerChoiceId: string | null;
	readonly context: string;
	readonly createdAt: Date;
	readonly deliveredAt: Date | null;
	readonly id: string;
	readonly question: string;
	readonly radius: string;
	readonly requesterAgentId: string;
	readonly ruledAt: Date | null;
	readonly ruledBy: string | null;
	readonly urgency: string;
}

export interface StoredRulingReclassification {
	readonly at: Date;
	readonly by: string;
	readonly note: string | null;
	readonly radius: string | null;
	readonly urgency: string | null;
}

export interface StoredRulingSubject {
	readonly agentId: string | null;
	readonly kind: string;
	readonly pieceId: string | null;
	readonly repoId: string | null;
	readonly tag: string | null;
	readonly voyageId: string | null;
}
