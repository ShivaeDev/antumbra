import type { RulingAuthority, RulingRadius, RulingUrgency } from "@antumbra/vocabulary/ruling";
import type { RulingAxes, RulingRequester, RulingSubject } from "#model.ts";

export interface RulingChoiceInput {
	readonly detail?: string;
	readonly label: string;
}

export interface RulingRecommendationInput {
	readonly choice: string;
	readonly reasoning: string;
}

export interface RulingRequest {
	readonly choices: ReadonlyArray<RulingChoiceInput>;
	readonly context: string;
	readonly gates: ReadonlyArray<string>;
	readonly question: string;
	readonly radius: RulingRadius;
	readonly recommendation?: RulingRecommendationInput;
	readonly requester: RulingRequester;
	readonly rung: RulingAuthority | null;
	readonly subjects: ReadonlyArray<RulingSubject>;
	readonly urgency: RulingUrgency;
}

export interface RulingContextInput {
	readonly authorAgentId?: string;
	readonly body: string;
	readonly rulingId: string;
}

export interface RulingParkInput {
	readonly note: string;
	readonly rulingId: string;
}

export interface RulingGateInput {
	readonly pieceIds: ReadonlyArray<string>;
	readonly rulingId: string;
}

export interface RulingVerdict {
	readonly answer: string;
	readonly by: RulingAuthority;
	readonly byAgentId?: string;
	readonly choiceId?: string;
	readonly rulingId: string;
}

export interface RulingProclamation extends RulingAxes {
	readonly answer: string;
	readonly by: RulingAuthority;
	readonly choices: ReadonlyArray<RulingChoiceInput>;
	readonly chosenChoice?: string;
	readonly context: string;
	readonly question: string;
	readonly subjects: ReadonlyArray<RulingSubject>;
}

export interface RulingReclassifyInput {
	readonly by: RulingAuthority;
	readonly byAgentId?: string;
	readonly note?: string;
	readonly radius?: RulingRadius;
	readonly rulingId: string;
	readonly urgency?: RulingUrgency;
}

export type RulingClimbingAuthority = Exclude<RulingAuthority, "admiral">;

export interface RulingPassUpInput {
	readonly by: RulingClimbingAuthority;
	readonly byAgentId?: string;
	readonly note: string;
	readonly rulingId: string;
}
