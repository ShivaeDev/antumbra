import type {
	RulingAuthority,
	RulingRadius,
} from "@antumbra/vocabulary/ruling";
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

// why: which authority may answer is decided by how widely the answer will
// apply, so a verdict from a rung that does not reach the ruling's radius is
// refused rather than stored — the record is what later readers trust to say
// the answer was given by someone entitled to give it.
export class RulingOutsideAuthority extends Data.TaggedError(
	"RulingOutsideAuthority",
)<{
	readonly by: RulingAuthority;
	readonly radius: RulingRadius;
	readonly rulingId: string;
}> {
	override get message(): string {
		return `the ${this.by} does not rule at ${this.radius} radius`;
	}
}

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

// why: a request that already climbed past a rung is no longer that rung's to
// settle. The record is what a later reader trusts to say the answer came from
// the authority the question was owed to when it was given.
export class RulingBelowRung extends Data.TaggedError("RulingBelowRung")<{
	readonly by: RulingAuthority;
	readonly rulingId: string;
	readonly rung: RulingAuthority | null;
}> {
	override get message(): string {
		return this.rung === null
			? `ruling ${this.rulingId} waits on nobody`
			: `ruling ${this.rulingId} waits on the ${this.rung}, above the ${this.by}`;
	}
}

// why: only the rung a question is owed to may carry it further up, so a
// captain cannot push a question that never reached it and no rung can move
// one that already climbed past.
export class RulingNotAtRung extends Data.TaggedError("RulingNotAtRung")<{
	readonly by: RulingAuthority;
	readonly rulingId: string;
	readonly rung: RulingAuthority | null;
}> {
	override get message(): string {
		return this.rung === null
			? `ruling ${this.rulingId} waits on nobody`
			: `ruling ${this.rulingId} waits on the ${this.rung}, not on the ${this.by}`;
	}
}
