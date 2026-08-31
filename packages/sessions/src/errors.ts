import { Data } from "effect";

export class SessionMessageEmpty extends Data.TaggedError("SessionMessageEmpty")<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `a message with no words cannot reach session ${this.sessionId}`;
	}
}

export class SessionIdentityMissing extends Data.TaggedError("SessionIdentityMissing")<{
	readonly sessionId: string;
}> {}

export class SessionNotFound extends Data.TaggedError("SessionNotFound")<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `there is no session ${this.sessionId} on the fleet`;
	}
}

export class SessionStillDelegating extends Data.TaggedError("SessionStillDelegating")<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `session ${this.sessionId} still has a delegated conversation under way and cannot be put to rest`;
	}
}

export class SessionEnded extends Data.TaggedError("SessionEnded")<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `session ${this.sessionId} has ended and cannot be spoken to`;
	}
}
