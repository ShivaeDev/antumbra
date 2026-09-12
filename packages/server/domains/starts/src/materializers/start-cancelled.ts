import { pieceAgentId } from "@antumbra/domain-agents/ids.ts";
import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { pieceAgent } from "@antumbra/domain-agents/rows/piece-agent.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { startCancelled } from "#facts/start-cancelled.ts";
import { start } from "#rows/start.ts";
export const startCancelledMaterializer = materializer(startCancelled, {
	writes: [start, agent, pieceAgent],
	run: Effect.fn("Starts.StartCancelled")(function* (fact, rows) {
		const held = yield* rows.start.get(fact.id);
		yield* rows.start.update(fact.id, { status: "cancelled", detail: null });
		yield* rows.agent.update(held.agentId, { status: "dormant", currentSessionId: null, updatedAt: new Date(fact.at).toISOString() });
		if (held.pieceId !== null) yield* rows.pieceAgent.delete(pieceAgentId(held.pieceId, held.agentId));
	}),
});
