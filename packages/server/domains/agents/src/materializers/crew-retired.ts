import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { crewRetired } from "#facts/crew-retired.ts";
import { agentRetiredMaterializer } from "#materializers/agent-retired.ts";
export const crewRetiredMaterializer = materializer(crewRetired, {
	writes: agentRetiredMaterializer.writes,
	run: Effect.fn("Agents.CrewRetired")(function* (fact, rows) {
		for (const id of fact.agentIds) yield* agentRetiredMaterializer.run({ id, at: fact.at, requestId: fact.requestId, seq: fact.seq }, rows);
	}),
});
