import { Data, Option, Result, Schema } from "effect";
import {
	type AgentSessionCompleteness,
	AgentSessionCompletenessSchema,
	type AgentSessionStatus,
	AgentSessionStatusSchema,
} from "#agent-runtime/statuses.ts";

export class StoredAgentSessionStatusInvalid extends Data.TaggedError(
	"StoredAgentSessionStatusInvalid",
)<{
	readonly sessionId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored AgentSession ${this.sessionId} has invalid status: ${String(this.value)}`;
	}
}

export class StoredAgentSessionCompletenessInvalid extends Data.TaggedError(
	"StoredAgentSessionCompletenessInvalid",
)<{
	readonly sessionId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored AgentSession ${this.sessionId} has invalid completeness: ${String(this.value)}`;
	}
}

export const decodeStoredAgentSessionStatus = (
	sessionId: string,
	value: unknown,
): Result.Result<AgentSessionStatus, StoredAgentSessionStatusInvalid> => {
	const decoded = Schema.decodeUnknownOption(AgentSessionStatusSchema)(value);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(new StoredAgentSessionStatusInvalid({ sessionId, value }));
};

export const decodeStoredAgentSessionCompleteness = (
	sessionId: string,
	value: unknown,
): Result.Result<
	AgentSessionCompleteness,
	StoredAgentSessionCompletenessInvalid
> => {
	const decoded = Schema.decodeUnknownOption(AgentSessionCompletenessSchema)(
		value,
	);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(
				new StoredAgentSessionCompletenessInvalid({ sessionId, value }),
			);
};
