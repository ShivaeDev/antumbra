import type { PrismaError } from "@antumbra/persistence";
import type { StoredRulingValueInvalid } from "@antumbra/vocabulary/ruling.ts";
import type {
	RulingAlreadyParked,
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
	RulingRecommendationMissing,
	RulingSubjectMissing,
	RulingSupersedesItself,
} from "#errors.ts";

export type RulingReadFailure = PrismaError | StoredRulingValueInvalid;

type RulingRequestFailure = RulingGatePieceMissing | RulingReadFailure | RulingRecommendationMissing | RulingSubjectMissing;

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

export type RulingWithdrawalFailure = RulingAlreadySuperseded | RulingAlreadyWithdrawn | RulingNotFound | RulingNotRuled | RulingReadFailure;

export type RulingReclassifyFailure = RulingAlreadyRuled | RulingNotFound | RulingReadFailure | RulingReclassificationEmpty;

export type RulingContextFailure = RulingAlreadyRuled | RulingNotFound | RulingReadFailure;

export type RulingParkFailure = RulingAlreadyParked | RulingAlreadyRuled | RulingNotFound | RulingReadFailure;
