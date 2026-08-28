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

export type RulingLookupFailure = RulingNotFound | RulingReadFailure;
