import { Data } from "effect";

export class CaptainAlreadyHailed extends Data.TaggedError("CaptainAlreadyHailed")<{
	readonly agentId: string;
	readonly voyageId: string;
}> {
	override get message(): string {
		return `voyage ${this.voyageId} already has captain ${this.agentId} at work`;
	}
}

export class CaptainSessionUnavailable extends Data.TaggedError("CaptainSessionUnavailable")<{
	readonly agentId: string;
	readonly detail: string;
	readonly voyageId: string;
}> {
	override get message(): string {
		return `captain ${this.agentId} cannot resume: ${this.detail}`;
	}
}
