import type { RulingAuthority, RulingRadius, RulingUrgency } from "@antumbra/vocabulary/ruling";
import type { RulingAxes, RulingRequester, RulingSubject } from "#model.ts";

export interface RulingChoiceInput {
	readonly detail?: string;
	readonly label: string;
}

// why: the pieces a request holds are named in the same act as the question,
// so a hold never lands without the ruling that can release it. The rung is
// the asker's station read at the moment of asking; an authority writing a
// rule for itself waits on nobody and names none.
export interface RulingRequest {
	readonly choices: ReadonlyArray<RulingChoiceInput>;
	readonly context: string;
	readonly gates: ReadonlyArray<string>;
	readonly question: string;
	readonly radius: RulingRadius;
	readonly requester: RulingRequester;
	readonly rung: RulingAuthority | null;
	readonly subjects: ReadonlyArray<RulingSubject>;
	readonly urgency: RulingUrgency;
}

export interface RulingGateInput {
	readonly pieceIds: ReadonlyArray<string>;
	readonly rulingId: string;
}

// why: a verdict given by an agent names the agent beside the rung it spoke
// for, so a later reader knows which captain answered rather than only that a
// captain did. The admiral rules from the window and names no agent.
export interface RulingVerdict {
	readonly answer: string;
	readonly by: RulingAuthority;
	readonly byAgentId?: string;
	readonly choiceId?: string;
	readonly rulingId: string;
}

// why: an authority that wants a standing rule asks and answers a ruling of
// its own, so the context that gives the answer its meaning is never missing.
// A picked choice is named by its label, because the ids do not exist yet.
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

// why: the admiral holds the top of the ladder and has nowhere to pass a
// question to, so the rungs that may climb are the two below it and the type
// says so rather than a refusal nobody can reach.
export type RulingClimbingAuthority = Exclude<RulingAuthority, "admiral">;

// why: a rung that cannot settle a question carries it up with what it knows,
// so the note is the whole point of the act and never optional.
export interface RulingPassUpInput {
	readonly by: RulingClimbingAuthority;
	readonly byAgentId?: string;
	readonly note: string;
	readonly rulingId: string;
}
