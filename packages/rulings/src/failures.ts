import type { PrismaError } from "@antumbra/persistence";
import type { StoredRulingValueInvalid } from "@antumbra/vocabulary/ruling";
import type {
	RulingAlreadyRuled,
	RulingAlreadySuperseded,
	RulingAlreadyWithdrawn,
	RulingBelowRung,
	RulingChoiceUnknown,
	RulingGatePieceMissing,
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

export type RulingSupersessionFailure =
	| RulingAlreadySuperseded
	| RulingAlreadyWithdrawn
	| RulingNotFound
	| RulingNotRuled
	| RulingReadFailure
	| RulingSupersedesItself;

export type RulingWithdrawalFailure =
	| RulingAlreadySuperseded
	| RulingAlreadyWithdrawn
	| RulingNotFound
	| RulingNotRuled
	| RulingReadFailure;

export type RulingReclassifyFailure =
	| RulingAlreadyRuled
	| RulingNotFound
	| RulingReadFailure
	| RulingReclassificationEmpty;
