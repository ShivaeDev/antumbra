import type {
	RulingAuthority,
	RulingRadius,
	RulingSubjectKind,
	RulingUrgency,
} from "@antumbra/vocabulary/ruling";
import type { Option } from "effect";

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

export interface RulingRequest {
	readonly choices: ReadonlyArray<RulingChoiceInput>;
	readonly context: string;
	readonly question: string;
	readonly radius: RulingRadius;
	readonly requesterAgentId: string;
	readonly subjects: ReadonlyArray<RulingSubject>;
	readonly urgency: RulingUrgency;
}

export interface RulingVerdict {
	readonly answer: string;
	readonly by: RulingAuthority;
	readonly choiceId?: string;
	readonly rulingId: string;
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
// answer read apart from its question loses the scope that bounds it.
export interface Ruling {
	readonly answer: Option.Option<RulingAnswer>;
	readonly choices: ReadonlyArray<RulingChoice>;
	readonly context: string;
	readonly createdAt: Date;
	readonly id: string;
	readonly question: string;
	readonly radius: RulingRadius;
	readonly requesterAgentId: string;
	readonly subjects: ReadonlyArray<RulingSubject>;
	readonly urgency: RulingUrgency;
}

export interface StoredRuling {
	readonly answer: string | null;
	readonly answerChoiceId: string | null;
	readonly context: string;
	readonly createdAt: Date;
	readonly id: string;
	readonly question: string;
	readonly radius: string;
	readonly requesterAgentId: string;
	readonly ruledAt: Date | null;
	readonly ruledBy: string | null;
	readonly urgency: string;
}

export interface StoredRulingSubject {
	readonly agentId: string | null;
	readonly kind: string;
	readonly pieceId: string | null;
	readonly repoId: string | null;
	readonly tag: string | null;
	readonly voyageId: string | null;
}
