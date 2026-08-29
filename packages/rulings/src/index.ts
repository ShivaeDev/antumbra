export type {
	RulingChoiceInput,
	RulingClimbingAuthority,
	RulingGateInput,
	RulingPassUpInput,
	RulingProclamation,
	RulingReclassifyInput,
	RulingRequest,
	RulingSupersedeInput,
	RulingVerdict,
} from "#acts.ts";
export { answersAt, reachesRung } from "#authority.ts";
export {
	RulingAlreadyRuled,
	RulingAlreadySuperseded,
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
	RulingSupersession,
} from "#model.ts";
export { Rulings, RulingsLive } from "#rulings.ts";
