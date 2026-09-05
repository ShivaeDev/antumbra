import type { RulingAuthority, RulingRadius } from "@antumbra/vocabulary/ruling";
import { Data } from "effect";
import type { RulingSubject } from "#model.ts";

export class RulingNotFound extends Data.TaggedError("RulingNotFound")<{
	readonly rulingId: string;
}> {}

export class RulingAlreadyRuled extends Data.TaggedError("RulingAlreadyRuled")<{
	readonly rulingId: string;
}> {}

export class RulingAlreadyParked extends Data.TaggedError("RulingAlreadyParked")<{
	readonly rulingId: string;
}> {}

export class RulingGatePieceMissing extends Data.TaggedError("RulingGatePieceMissing")<{
	readonly pieceId: string;
}> {}

export class RulingNotRuled extends Data.TaggedError("RulingNotRuled")<{
	readonly rulingId: string;
}> {}

export class RulingSupersedesItself extends Data.TaggedError("RulingSupersedesItself")<{
	readonly rulingId: string;
}> {}

export class RulingAlreadySuperseded extends Data.TaggedError("RulingAlreadySuperseded")<{
	readonly byRulingId: string;
	readonly rulingId: string;
}> {}

export class RulingAlreadyWithdrawn extends Data.TaggedError("RulingAlreadyWithdrawn")<{
	readonly rulingId: string;
}> {}

export class RulingChoiceUnknown extends Data.TaggedError("RulingChoiceUnknown")<{
	readonly choiceId: string;
	readonly rulingId: string;
}> {}

export class RulingOutsideAuthority extends Data.TaggedError("RulingOutsideAuthority")<{
	readonly by: RulingAuthority;
	readonly radius: RulingRadius;
	readonly rulingId: string;
}> {
	override get message(): string {
		return `the ${this.by} does not rule at ${this.radius} radius`;
	}
}

export class RulingSubjectMissing extends Data.TaggedError("RulingSubjectMissing")<{
	readonly subject: RulingSubject;
}> {
	override get message(): string {
		const subject = this.subject;
		const named = subject.kind === "tag" ? subject.tag : `${subject.kind} ${subject.id}`;
		return `the fleet has no ${named}`;
	}
}

export class RulingReclassificationEmpty extends Data.TaggedError("RulingReclassificationEmpty")<{
	readonly rulingId: string;
}> {}

export class RulingBelowRung extends Data.TaggedError("RulingBelowRung")<{
	readonly by: RulingAuthority;
	readonly rulingId: string;
	readonly rung: RulingAuthority | null;
}> {
	override get message(): string {
		return this.rung === null ? `ruling ${this.rulingId} waits on nobody` : `ruling ${this.rulingId} waits on the ${this.rung}, above the ${this.by}`;
	}
}

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
