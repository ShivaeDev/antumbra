export type {
	RulingChoiceInput,
	RulingClimbingAuthority,
	RulingProclamation,
	RulingReclassifyInput,
	RulingRecommendationInput,
	RulingRequest,
	RulingVerdict,
} from "#acts.ts";
export { answersAt, reachesRung } from "#authority.ts";
export { RulingOutsideAuthority } from "#errors.ts";
export type {
	RulingProclaimFailure,
	RulingReadFailure,
	RulingReclassifyFailure,
	RulingSupersessionFailure,
	RulingVerdictFailure,
	RulingWithdrawalFailure,
} from "#failures.ts";
export type {
	Ruling,
	RulingAnswer,
	RulingChoice,
	RulingGate,
	RulingReclassification,
	RulingRecommendation,
	RulingSubject,
} from "#model.ts";
export { Rulings, RulingsLive } from "#rulings.ts";
