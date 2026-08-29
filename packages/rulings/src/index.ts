export type {
	RulingChoiceInput,
	RulingClimbingAuthority,
	RulingGateInput,
	RulingPassUpInput,
	RulingProclamation,
	RulingReclassifyInput,
	RulingRequest,
	RulingVerdict,
} from "#acts.ts";
export { answersAt, reachesRung } from "#authority.ts";
export {
	RulingAlreadyRuled,
	RulingAlreadySuperseded,
	RulingAlreadyWithdrawn,
	RulingBelowRung,
	RulingChoiceUnknown,
	RulingGatePieceMissing,
	RulingNotAtRung,
	RulingNotFound,
	RulingNotRuled,
	RulingOutsideAuthority,
	RulingReclassificationEmpty,
	RulingSubjectMissing,
	RulingSupersedesItself,
} from "#errors.ts";
export type {
	RulingGateFailure,
	RulingPassUpFailure,
	RulingProclaimFailure,
	RulingReadFailure,
	RulingReclassifyFailure,
	RulingRequestFailure,
	RulingSupersessionFailure,
	RulingVerdictFailure,
	RulingWithdrawalFailure,
} from "#failures.ts";
export type {
	Ruling,
	RulingAnswer,
	RulingAxes,
	RulingChoice,
	RulingGate,
	RulingReclassification,
	RulingRequester,
	RulingSubject,
} from "#model.ts";
export type {
	RulingSupersedeInput,
	RulingSupersession,
	RulingWithdrawal,
	RulingWithdrawInput,
} from "#retirement.ts";
export { Rulings, RulingsLive } from "#rulings.ts";
