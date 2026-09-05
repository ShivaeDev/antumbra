import type { RulingAuthority, RulingRadius, RulingSubjectKind, RulingUrgency } from "@antumbra/vocabulary/ruling";
import type { Option } from "effect";
import type { RulingSupersession, RulingWithdrawal } from "#retirement.ts";

export interface RulingAxes {
	readonly radius: RulingRadius;
	readonly urgency: RulingUrgency;
}

export type RulingReferenceKind = Exclude<RulingSubjectKind, "tag">;

export type RulingSubject = { readonly id: string; readonly kind: RulingReferenceKind } | { readonly kind: "tag"; readonly tag: string };

export type RulingRequester = { readonly agentId: string; readonly kind: "agent" } | { readonly by: RulingAuthority; readonly kind: "authority" };

export interface RulingGate {
	readonly pieceId: string;
	readonly question: string;
	readonly rulingId: string;
}

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

export interface RulingContext {
	readonly at: Date;
	readonly authorAgentId: Option.Option<string>;
	readonly body: string;
}

export interface RulingParking {
	readonly at: Date;
	readonly note: string;
}

export interface RulingAnswer {
	readonly at: Date;
	readonly by: RulingAuthority;
	readonly byAgentId: Option.Option<string>;
	readonly choiceId: Option.Option<string>;
	readonly text: string;
}

export interface Ruling {
	readonly answer: Option.Option<RulingAnswer>;
	readonly choices: ReadonlyArray<RulingChoice>;
	readonly context: string;
	readonly contexts: ReadonlyArray<RulingContext>;
	readonly createdAt: Date;
	readonly declared: RulingAxes;
	readonly gatedPieceIds: ReadonlyArray<string>;
	readonly id: string;
	readonly parked: Option.Option<RulingParking>;
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
