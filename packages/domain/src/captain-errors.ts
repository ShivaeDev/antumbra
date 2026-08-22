import { Data } from "effect";

// why: a voyage is under way because its captain is at work, so hailing a
// second one while the first still is would give the voyage two accountable
// addresses. The refusal names the captain it already has.
export class CaptainAlreadyHailed extends Data.TaggedError(
	"CaptainAlreadyHailed",
)<{
	readonly agentId: string;
	readonly voyageId: string;
}> {
	override get message(): string {
		return `voyage ${this.voyageId} already has captain ${this.agentId} at work`;
	}
}

export class CaptainSessionUnavailable extends Data.TaggedError(
	"CaptainSessionUnavailable",
)<{
	readonly agentId: string;
	readonly detail: string;
	readonly voyageId: string;
}> {
	override get message(): string {
		return `captain ${this.agentId} cannot resume: ${this.detail}`;
	}
}
