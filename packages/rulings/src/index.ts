export {
	RulingAlreadyRuled,
	RulingChoiceUnknown,
	type RulingGateFailure,
	RulingGatePieceMissing,
	RulingNotFound,
	type RulingReadFailure,
	RulingReclassificationEmpty,
	type RulingReclassifyFailure,
	type RulingRequestFailure,
	RulingSubjectMissing,
	type RulingVerdictFailure,
} from "#errors.ts";
export type {
	Ruling,
	RulingAnswer,
	RulingAxes,
	RulingChoice,
	RulingChoiceInput,
	RulingGate,
	RulingGateInput,
	RulingReclassification,
	RulingReclassifyInput,
	RulingRequest,
	RulingSubject,
	RulingVerdict,
} from "#model.ts";
export { Rulings, RulingsLive } from "#rulings.ts";
