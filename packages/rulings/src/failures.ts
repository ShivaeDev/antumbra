import type { PrismaError } from "@antumbra/persistence";
import type { StoredRulingValueInvalid } from "@antumbra/vocabulary/ruling";
import type {
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

export type RulingReadFailure = PrismaError | StoredRulingValueInvalid;

export type RulingRequestFailure =
	| RulingGatePieceMissing
	| RulingReadFailure
	| RulingSubjectMissing;

export type RulingVerdictFailure =
	| RulingAlreadyRuled
	| RulingBelowRung
	| RulingChoiceUnknown
	| RulingNotFound
	| RulingOutsideAuthority
	| RulingReadFailure;

export type RulingProclaimFailure = RulingRequestFailure | RulingVerdictFailure;

export type RulingGateFailure =
	| RulingAlreadyRuled
	| RulingGatePieceMissing
	| RulingNotFound
	| RulingReadFailure;

export type RulingSupersessionFailure =
	| RulingAlreadySuperseded
	| RulingNotFound
	| RulingNotRuled
	| RulingReadFailure
	| RulingSupersedesItself;

export type RulingReclassifyFailure =
	| RulingAlreadyRuled
	| RulingNotFound
	| RulingReadFailure
	| RulingReclassificationEmpty;

export type RulingPassUpFailure =
	| RulingAlreadyRuled
	| RulingNotAtRung
	| RulingNotFound
	| RulingReadFailure;

export type RulingLookupFailure = RulingNotFound | RulingReadFailure;
