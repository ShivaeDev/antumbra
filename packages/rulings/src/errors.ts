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
}> {
	override get message(): string {
		const subject = this.subject;
		const named =
			subject.kind === "tag" ? subject.tag : `${subject.kind} ${subject.id}`;
		return `the fleet has no ${named}`;
	}
}

// why: a reclassification that names no axis would append a row saying
// nothing, so it is refused before anything is written.
export class RulingReclassificationEmpty extends Data.TaggedError(
	"RulingReclassificationEmpty",
)<{
	readonly rulingId: string;
}> {}

export type RulingReadFailure = PrismaError | StoredRulingValueInvalid;

export type RulingRequestFailure =
	| RulingGatePieceMissing
	| RulingReadFailure
	| RulingSubjectMissing;

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

export type RulingReclassifyFailure =
	| RulingAlreadyRuled
	| RulingNotFound
	| RulingReadFailure
	| RulingReclassificationEmpty;

export type RulingLookupFailure = RulingNotFound | RulingReadFailure;
