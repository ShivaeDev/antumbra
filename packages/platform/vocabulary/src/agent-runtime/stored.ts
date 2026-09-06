import { Data, Option, Result, Schema } from "effect";
import {
	type AgentStatus,
	AgentStatusSchema,
	type BerthStatus,
	BerthStatusSchema,
	type MoorageStatus,
	MoorageStatusSchema,
	type ResourceReclaimState,
	ResourceReclaimStateSchema,
} from "#agent-runtime/statuses.ts";

export class StoredAgentStatusInvalid extends Data.TaggedError("StoredAgentStatusInvalid")<{
	readonly agentId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored Agent ${this.agentId} has invalid status: ${String(this.value)}`;
	}
}

export class StoredMoorageStatusInvalid extends Data.TaggedError("StoredMoorageStatusInvalid")<{
	readonly agentId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored Moorage for Agent ${this.agentId} has invalid status: ${String(this.value)}`;
	}
}

export class StoredBerthStatusInvalid extends Data.TaggedError("StoredBerthStatusInvalid")<{
	readonly berthId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored Berth ${this.berthId} has invalid status: ${String(this.value)}`;
	}
}

export class StoredResourceReclaimStateInvalid extends Data.TaggedError("StoredResourceReclaimStateInvalid")<{
	readonly resourceId: string;
	readonly resourceKind: "Berth" | "Moorage";
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored ${this.resourceKind} ${this.resourceId} has invalid reclaim state: ${String(this.value)}`;
	}
}

export const decodeStoredAgentStatus = (agentId: string, value: unknown): Result.Result<AgentStatus, StoredAgentStatusInvalid> => {
	const decoded = Schema.decodeUnknownOption(AgentStatusSchema)(value);
	return Option.isSome(decoded) ? Result.succeed(decoded.value) : Result.fail(new StoredAgentStatusInvalid({ agentId, value }));
};

export const decodeStoredMoorageStatus = (agentId: string, value: unknown): Result.Result<MoorageStatus, StoredMoorageStatusInvalid> => {
	const decoded = Schema.decodeUnknownOption(MoorageStatusSchema)(value);
	return Option.isSome(decoded) ? Result.succeed(decoded.value) : Result.fail(new StoredMoorageStatusInvalid({ agentId, value }));
};

export const decodeStoredBerthStatus = (berthId: string, value: unknown): Result.Result<BerthStatus, StoredBerthStatusInvalid> => {
	const decoded = Schema.decodeUnknownOption(BerthStatusSchema)(value);
	return Option.isSome(decoded) ? Result.succeed(decoded.value) : Result.fail(new StoredBerthStatusInvalid({ berthId, value }));
};

export const decodeStoredResourceReclaimState = (
	resourceKind: "Berth" | "Moorage",
	resourceId: string,
	value: unknown,
): Result.Result<ResourceReclaimState | null, StoredResourceReclaimStateInvalid> => {
	if (value === null) {
		return Result.succeed(null);
	}
	const decoded = Schema.decodeUnknownOption(ResourceReclaimStateSchema)(value);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(
				new StoredResourceReclaimStateInvalid({
					resourceId,
					resourceKind,
					value,
				}),
			);
};
