import { Data } from "effect";

export class ResourceReclaimClaimed extends Data.TaggedError(
	"ResourceReclaimClaimed",
)<{
	readonly agentId: string;
	readonly resourceId: string;
}> {
	override get message(): string {
		return `Agent ${this.agentId} resource ${this.resourceId} is claimed for reclamation`;
	}
}

export class ResourceReclaimClaimInvalid extends Data.TaggedError(
	"ResourceReclaimClaimInvalid",
)<{
	readonly agentId: string;
	readonly detail: string;
}> {
	override get message(): string {
		return `Agent ${this.agentId} has invalid durable reclaim ownership: ${this.detail}`;
	}
}
