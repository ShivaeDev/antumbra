import { Data, Option, Result, Schema } from "effect";
import { SubsessionOutcome } from "#session-events/subsessions.ts";

// Stored outcomes are text; decode them before treating them as vocabulary, with null meaning no ending.
const StoredSubsessionOutcome = Schema.NullOr(SubsessionOutcome);

export class StoredSubsessionOutcomeInvalid extends Data.TaggedError("StoredSubsessionOutcomeInvalid")<{
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
): Result.Result<typeof StoredSubsessionOutcome.Type, StoredSubsessionOutcomeInvalid> => {
	const decoded = Schema.decodeUnknownOption(StoredSubsessionOutcome)(value);
	return Option.isSome(decoded) ? Result.succeed(decoded.value) : Result.fail(new StoredSubsessionOutcomeInvalid({ sessionId, value }));
};
