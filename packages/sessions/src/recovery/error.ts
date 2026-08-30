import { Data } from "effect";

export class SessionRecoveryHeld extends Data.TaggedError("SessionRecoveryHeld")<{
	readonly detail: string;
}> {}

export const recoveryHeld = (detail: string) => new SessionRecoveryHeld({ detail });
