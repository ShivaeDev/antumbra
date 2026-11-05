import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { berth } from "@antumbra/domain-reclamation/rows/berth.ts";
import { moorage } from "@antumbra/domain-reclamation/rows/moorage.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const claimRows = [berth, moorage, agent] as const;
export const ownerAvailable = Effect.fn("changes.ownerAvailable")(function* (id: string) {
	const rows = yield* Records;

	const held = yield* rows.agent
		.findOne({
			where: { id: AgentId.make(id) },
			orderBy: { field: "storage_order", direction: "asc" },
			select: ["id", "role", "status", "currentSessionId", "createdAt", "updatedAt"],
		})
		.pipe(Effect.orDie);
	return Option.isSome(held) && held.value.status !== "dormant" && held.value.status !== "retired";
});
export const claimed = Effect.fn("changes.claimed")(function* (agentId: string | null, source: string, branch: string) {
	const rows = yield* Records;

	const berths = yield* rows.berth
		.findMany({
			where: {},
			orderBy: { field: "storage_order", direction: "asc" },
			select: [
				"id",
				"agentId",
				"runner",
				"source",
				"slug",
				"ref",
				"branch",
				"path",
				"status",
				"reclaimRequestId",
				"reclaimResult",
				"reclaimState",
				"strandedAt",
			],
		})
		.pipe(Effect.orDie);
	const relevant = berths.filter((row) => (agentId !== null && row.agentId === agentId) || (row.source === source && row.branch === branch));
	if (relevant.some((row) => row.reclaimState !== null)) return true;
	const owners = new Set(relevant.map((row) => row.agentId));
	if (agentId !== null) owners.add(agentId);
	return (yield* rows.moorage
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: ["agentId", "runner", "root", "status", "reclaimState"] })
		.pipe(Effect.orDie)).some((row) => owners.has(row.agentId) && row.reclaimState !== null);
});
