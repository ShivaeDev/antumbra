export interface StoredRuling {
	readonly answer: string | null;
	readonly answerChoiceId: string | null;
	readonly context: string;
	readonly createdAt: Date;
	readonly deliveredAt: Date | null;
	readonly id: string;
	readonly parkedAt: Date | null;
	readonly parkedNote: string | null;
	readonly question: string;
	readonly radius: string;
	readonly recommendationReasoning: string | null;
	readonly recommendedChoiceId: string | null;
	readonly requesterAgentId: string | null;
	readonly requesterAuthority: string | null;
	readonly ruledAt: Date | null;
	readonly ruledBy: string | null;
	readonly ruledByAgentId: string | null;
	readonly rung: string | null;
	readonly supersededAt: Date | null;
	readonly supersededBy: string | null;
	readonly supersededById: string | null;
	readonly urgency: string;
	readonly withdrawnAt: Date | null;
	readonly withdrawnBy: string | null;
	readonly withdrawnNote: string | null;
}

export interface StoredRulingReclassification {
	readonly at: Date;
	readonly by: string;
	readonly byAgentId: string | null;
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

export interface StoredRulingContext {
	readonly at: Date;
	readonly authorAgentId: string | null;
	readonly body: string;
}
