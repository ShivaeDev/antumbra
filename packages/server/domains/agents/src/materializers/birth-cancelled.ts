import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { birthCancelled } from "#facts/birth-cancelled.ts";
import { pieceAgentId } from "#ids.ts";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
export const birthCancelledMaterializer = materializer(birthCancelled, {
	writes: [birth, agent, pieceAgent],
	run: Effect.fn("Agents.BirthCancelled")(function* (fact, rows) {
		const held = yield* rows.birth.get(fact.id);
		yield* rows.birth.update(fact.id, { status: "cancelled", detail: null });
		yield* rows.agent.update(held.agentId, {
			status: held.createsAgent ? "dormant" : "alive",
			currentSessionId: null,
			updatedAt: new Date(fact.at).toISOString(),
		});
		if (held.pieceId !== null) yield* rows.pieceAgent.delete(pieceAgentId(held.pieceId, held.agentId));
	}),
});
