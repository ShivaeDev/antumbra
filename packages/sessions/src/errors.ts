import { Data } from "effect";

// why: what a Session refuses, gathered where the Session's own rules are
// stated. Each one names a reading that had already gone stale by the time
// it was acted on, because a refusal nobody can read is indistinguishable
// from the act quietly not happening.

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

// why: only a root is ever attached, and the delegated conversations under it
// ride that one acquisition — so putting it to rest would take their stream
// away mid-sentence. The refusal is named rather than silent because whoever
// asked was reading a moment that had already passed, and a Session that
// quietly stayed awake would look exactly like one that had been put to rest.
export class SessionStillDelegating extends Data.TaggedError("SessionStillDelegating")<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `session ${this.sessionId} still has a delegated conversation under way and cannot be put to rest`;
	}
}

// why: the one state that refuses words. Every other state either holds the
// conversation open or can be woken back into it, so this refusal is the whole
// set of ways an Agent can stop being reachable.
export class SessionEnded extends Data.TaggedError("SessionEnded")<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `session ${this.sessionId} has ended and cannot be spoken to`;
	}
}
