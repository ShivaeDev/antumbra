export type {
	RulingChoiceInput,
	RulingClimbingAuthority,
	RulingProclamation,
	RulingReclassifyInput,
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
	RulingSubject,
} from "#model.ts";
export { Rulings, RulingsLive } from "#rulings.ts";
