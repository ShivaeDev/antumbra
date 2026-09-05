import { Database } from "@antumbra/persistence";
import { decodeStoredAgentStatus, decodeStoredResourceReclaimState } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { ResourceOwnerUnavailable, ResourceReclaimClaimed } from "#resource-reclaim-errors.ts";

const requireAvailableAgent = Effect.fnUntraced(function* (agentId: string) {
	const db = yield* Database;
	const agent = yield* db.Agent.where({ id: agentId }).first();
	if (Option.isNone(agent)) {
		return yield* new ResourceOwnerUnavailable({
			agentId,
			status: "missing",
		});
	}
	const status = yield* Effect.fromResult(decodeStoredAgentStatus(agentId, agent.value.status));
	if (status === "dormant" || status === "retired") {
		return yield* new ResourceOwnerUnavailable({ agentId, status });
	}
});

const claimed = (resourceKind: "Berth" | "Moorage", resourceId: string, agentId: string, value: unknown) =>
	Effect.fromResult(decodeStoredResourceReclaimState(resourceKind, resourceId, value)).pipe(
		Effect.flatMap((state) => (state === "claimed" ? new ResourceReclaimClaimed({ agentId, resourceId }) : Effect.void)),
	);

export const ensureAgentResourcesUnclaimed = Effect.fn("ResourceReclamation.ensureAgentResourcesUnclaimed")(function* (agentId: string) {
	const db = yield* Database;
	const moorage = yield* db.Moorage.where({ agentId }).first();
	if (Option.isSome(moorage)) {
		yield* claimed("Moorage", moorage.value.agentId, agentId, moorage.value.reclaimState);
	}
	const berths = yield* db.Berth.where({ agentId }).all();
	yield* Effect.forEach(berths, (berth) => claimed("Berth", berth.id, agentId, berth.reclaimState));
});

const ensureStoredBerthUnclaimed = Effect.fnUntraced(function* (berth: {
	readonly id: string;
	readonly agentId: string;
	readonly reclaimState: string | null;
}) {
	const db = yield* Database;
	yield* claimed("Berth", berth.id, berth.agentId, berth.reclaimState);
	const moorage = yield* db.Moorage.where({
		agentId: berth.agentId,
	}).first();
	if (Option.isSome(moorage)) {
		yield* claimed("Moorage", moorage.value.agentId, berth.agentId, moorage.value.reclaimState);
	}
});

export const ensureBerthResourcesUnclaimed = Effect.fn("ResourceReclamation.ensureBerthResourcesUnclaimed")(function* (berthId: string) {
	const db = yield* Database;
	const berth = yield* db.Berth.where({ id: berthId }).first();
	if (Option.isSome(berth)) yield* ensureStoredBerthUnclaimed(berth.value);
});

export const ensureAgentCanOwnLocalWork = (agentId: string) =>
	requireAvailableAgent(agentId).pipe(Effect.andThen(ensureAgentResourcesUnclaimed(agentId)));

export const ensureBranchResourcesUnclaimed = Effect.fn("ResourceReclamation.ensureBranchResourcesUnclaimed")(function* (
	source: string,
	branch: string,
) {
	const db = yield* Database;
	const berths = yield* db.Berth.where({ branch, source }).all();
	yield* Effect.forEach(berths, ensureStoredBerthUnclaimed);
});
