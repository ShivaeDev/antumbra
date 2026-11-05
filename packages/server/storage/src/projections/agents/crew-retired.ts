import type { crewRetired } from "@antumbra/domain-agents/facts/crew-retired.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { agentRetiredMaterializer } from "#projections/agents/agent-retired.ts";
import type { Records } from "#records.ts";
export const crewRetiredMaterializer = Effect.fn("Agents.CrewRetired")(function* (
	fact: FactValue<typeof crewRetired>,
): Effect.fn.Return<void, never, Records> {
	for (const id of fact.agentIds) yield* agentRetiredMaterializer({ id, at: fact.at, requestId: fact.requestId, seq: fact.seq });
});
