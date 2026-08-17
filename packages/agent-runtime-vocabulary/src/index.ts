import { Data, Option, Result, Schema } from "effect";

// why: domain recovery and artifact ownership read these same durable runtime
// words. This package is a leaf so neither capability can widen the vocabulary
// or make the other import its implementation.
export const AgentStatusSchema = Schema.Literals([
	"spawning",
	"alive",
	"dormant",
	"retired",
]);
export type AgentStatus = typeof AgentStatusSchema.Type;

export const AgentSessionStatusSchema = Schema.Literals(["open", "closed"]);
export type AgentSessionStatus = typeof AgentSessionStatusSchema.Type;

export const MoorageStatusSchema = Schema.Literals(["provisioning", "ready"]);
export type MoorageStatus = typeof MoorageStatusSchema.Type;

export const BerthStatusSchema = Schema.Literals([
	"provisioning",
	"ready",
	"stranded",
	"reclaimed",
]);
export type BerthStatus = typeof BerthStatusSchema.Type;

export class StoredAgentStatusInvalid extends Data.TaggedError(
	"StoredAgentStatusInvalid",
)<{
	readonly agentId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored Agent ${this.agentId} has invalid status: ${String(this.value)}`;
	}
}

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

export class StoredMoorageStatusInvalid extends Data.TaggedError(
	"StoredMoorageStatusInvalid",
)<{
	readonly agentId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored Moorage for Agent ${this.agentId} has invalid status: ${String(this.value)}`;
	}
}

export class StoredBerthStatusInvalid extends Data.TaggedError(
	"StoredBerthStatusInvalid",
)<{
	readonly berthId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored Berth ${this.berthId} has invalid status: ${String(this.value)}`;
	}
}

export const decodeStoredAgentStatus = (
	agentId: string,
	value: unknown,
): Result.Result<AgentStatus, StoredAgentStatusInvalid> => {
	const decoded = Schema.decodeUnknownOption(AgentStatusSchema)(value);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(new StoredAgentStatusInvalid({ agentId, value }));
};

export const decodeStoredAgentSessionStatus = (
	sessionId: string,
	value: unknown,
): Result.Result<AgentSessionStatus, StoredAgentSessionStatusInvalid> => {
	const decoded = Schema.decodeUnknownOption(AgentSessionStatusSchema)(value);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(new StoredAgentSessionStatusInvalid({ sessionId, value }));
};

export const decodeStoredMoorageStatus = (
	agentId: string,
	value: unknown,
): Result.Result<MoorageStatus, StoredMoorageStatusInvalid> => {
	const decoded = Schema.decodeUnknownOption(MoorageStatusSchema)(value);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(new StoredMoorageStatusInvalid({ agentId, value }));
};

export const decodeStoredBerthStatus = (
	berthId: string,
	value: unknown,
): Result.Result<BerthStatus, StoredBerthStatusInvalid> => {
	const decoded = Schema.decodeUnknownOption(BerthStatusSchema)(value);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(new StoredBerthStatusInvalid({ berthId, value }));
};
