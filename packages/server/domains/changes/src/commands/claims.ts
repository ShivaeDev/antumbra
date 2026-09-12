import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { berth } from "@antumbra/domain-reclamation/rows/berth.ts";
import { moorage } from "@antumbra/domain-reclamation/rows/moorage.ts";
import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { Effect, Option } from "effect";
export const claimRows = [berth, moorage, agent] as const;
export const ownerAvailable = Effect.fn("changes.ownerAvailable")(function* (rows: ReadHandles<typeof claimRows>, id: string) {
	const held = yield* rows.agent.find(AgentId.make(id));
	return Option.isSome(held) && held.value.status !== "dormant" && held.value.status !== "retired";
});
export const claimed = Effect.fn("changes.claimed")(function* (
	rows: ReadHandles<typeof claimRows>,
	agentId: string | null,
	source: string,
	branch: string,
) {
	const berths = yield* rows.berth.where({});
	const relevant = berths.filter((row) => (agentId !== null && row.agentId === agentId) || (row.source === source && row.branch === branch));
	if (relevant.some((row) => row.reclaimState !== null)) return true;
	const owners = new Set(relevant.map((row) => row.agentId));
	if (agentId !== null) owners.add(agentId);
	return (yield* rows.moorage.where({})).some((row) => owners.has(row.agentId) && row.reclaimState !== null);
});
