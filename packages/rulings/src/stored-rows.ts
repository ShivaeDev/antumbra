// why: these are the rows as the database hands them back, before any decoding
// into the model; a reader that trusts them as the model is reading corruption.
export interface StoredRuling {
	readonly answer: string | null;
	readonly answerChoiceId: string | null;
	readonly context: string;
	readonly createdAt: Date;
	readonly deliveredAt: Date | null;
	readonly id: string;
	readonly question: string;
	readonly radius: string;
	readonly requesterAgentId: string | null;
	readonly requesterAuthority: string | null;
	readonly ruledAt: Date | null;
	readonly ruledBy: string | null;
	readonly supersededAt: Date | null;
	readonly supersededBy: string | null;
	readonly supersededById: string | null;
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
