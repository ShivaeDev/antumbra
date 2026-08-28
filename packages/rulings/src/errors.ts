import type { PrismaError } from "@antumbra/persistence";
import type { StoredRulingValueInvalid } from "@antumbra/vocabulary/ruling";
import { Data } from "effect";
import type { RulingSubject } from "#model.ts";

export class RulingNotFound extends Data.TaggedError("RulingNotFound")<{
	readonly rulingId: string;
}> {}

export class RulingAlreadyRuled extends Data.TaggedError("RulingAlreadyRuled")<{
	readonly rulingId: string;
}> {}

// why: a gate hangs a piece on an answer, so naming a piece the fleet does not
// have refuses the gate rather than storing a hold nothing can ever release.
export class RulingGatePieceMissing extends Data.TaggedError(
	"RulingGatePieceMissing",
)<{
	readonly pieceId: string;
}> {}

// why: a ruling stands once ruled, so only a ruled ruling can be superseded
// and only a ruled ruling can supersede — an open question binds nothing yet.
export class RulingNotRuled extends Data.TaggedError("RulingNotRuled")<{
	readonly rulingId: string;
}> {}

export class RulingSupersedesItself extends Data.TaggedError(
	"RulingSupersedesItself",
)<{
	readonly rulingId: string;
}> {}

// why: supersession appends once with provenance; a second one would rewrite
// which ruling took the old one's place, and standing rulings are never edited.
export class RulingAlreadySuperseded extends Data.TaggedError(
	"RulingAlreadySuperseded",
)<{
	readonly byRulingId: string;
	readonly rulingId: string;
}> {}

export class RulingChoiceUnknown extends Data.TaggedError(
	"RulingChoiceUnknown",
)<{
	readonly choiceId: string;
	readonly rulingId: string;
}> {}

// why: scope is never left as prose, so a subject naming something the fleet
// does not have refuses the whole request rather than storing a dangling word.
export class RulingSubjectMissing extends Data.TaggedError(
	"RulingSubjectMissing",
)<{
	readonly subject: RulingSubject;
}> {}

export type RulingReadFailure = PrismaError | StoredRulingValueInvalid;

export type RulingRequestFailure = RulingReadFailure | RulingSubjectMissing;

export type RulingVerdictFailure =
	| RulingAlreadyRuled
	| RulingChoiceUnknown
	| RulingNotFound
	| RulingReadFailure;

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

export type RulingLookupFailure = RulingNotFound | RulingReadFailure;
