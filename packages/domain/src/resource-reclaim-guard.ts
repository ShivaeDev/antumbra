import { Database } from "@antumbra/persistence";
import { decodeStoredResourceReclaimState } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { ResourceReclaimClaimed } from "#errors.ts";

const claimed = (
	resourceKind: "Berth" | "Moorage",
	resourceId: string,
	agentId: string,
	value: unknown,
) =>
	Effect.fromResult(
		decodeStoredResourceReclaimState(resourceKind, resourceId, value),
	).pipe(
		Effect.flatMap((state) =>
			state === "claimed"
				? new ResourceReclaimClaimed({ agentId, resourceId })
				: Effect.void,
		),
	);

export const ensureAgentResourcesUnclaimed = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const moorage = yield* db.Moorage.where({ agentId }).first();
		if (Option.isSome(moorage)) {
			yield* claimed(
				"Moorage",
				moorage.value.agentId,
				agentId,
				moorage.value.reclaimState,
			);
		}
		const berths = yield* db.Berth.where({ agentId }).all();
		yield* Effect.forEach(berths, (berth) =>
			claimed("Berth", berth.id, agentId, berth.reclaimState),
		);
	});

export const ensureBerthResourcesUnclaimed = (berthId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const berth = yield* db.Berth.where({ id: berthId }).first();
		if (Option.isNone(berth)) {
			return;
		}
		yield* claimed(
			"Berth",
			berth.value.id,
			berth.value.agentId,
			berth.value.reclaimState,
		);
		const moorage = yield* db.Moorage.where({
			agentId: berth.value.agentId,
		}).first();
		if (Option.isSome(moorage)) {
			yield* claimed(
				"Moorage",
				moorage.value.agentId,
				berth.value.agentId,
				moorage.value.reclaimState,
			);
		}
	});

export const ensureBranchResourcesUnclaimed = (
	source: string,
	branch: string,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const berths = yield* db.Berth.where({ branch, source }).all();
		yield* Effect.forEach(berths, (berth) =>
			ensureBerthResourcesUnclaimed(berth.id),
		);
	});
