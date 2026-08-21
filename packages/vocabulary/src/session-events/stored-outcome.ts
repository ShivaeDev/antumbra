import { Data, Option, Result, Schema } from "effect";
import { SubsessionOutcome } from "#session-events/subsessions.ts";

// why: the ending word is written to a durable column that can only hold text,
// so it comes back as text and has to be read back into the vocabulary before
// anything downstream may treat it as one of these four words. A node that has
// not stopped has no ending, so null is a value here rather than an absence.
const StoredSubsessionOutcome = Schema.NullOr(SubsessionOutcome);

export class StoredSubsessionOutcomeInvalid extends Data.TaggedError(
	"StoredSubsessionOutcomeInvalid",
)<{
	readonly sessionId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored AgentSession ${this.sessionId} has invalid outcome: ${String(this.value)}`;
	}
}

export const decodeStoredSubsessionOutcome = (
	sessionId: string,
	value: unknown,
): Result.Result<
	typeof StoredSubsessionOutcome.Type,
	StoredSubsessionOutcomeInvalid
> => {
	const decoded = Schema.decodeUnknownOption(StoredSubsessionOutcome)(value);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(new StoredSubsessionOutcomeInvalid({ sessionId, value }));
};
