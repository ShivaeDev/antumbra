import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { smoothingRequested } from "#facts/smoothing-requested.ts";
import { voyageAgentId } from "#ids.ts";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const smoothingRequestedMaterializer = materializer(smoothingRequested, {
	writes: [birth, agent, voyageAgent],
	run: Effect.fn("Agents.SmoothingRequested")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		yield* rows.birth.insert({
			id: fact.id,
			operationRequestId: fact.requestId,
			createsAgent: fact.createsAgent,
			cwd: fact.cwd,
			source: "direct",
			agentId: fact.agentId,
			sessionId: fact.sessionId,
			voyageId: fact.voyageId,
			pieceId: null,
			backend: null,
			model: null,
			effort: null,
			role: "smoother",
			status: "requested",
			detail: null,
			requestedAt: at,
			admittedAt: null,
		});
		if (fact.createsAgent) {
			yield* rows.agent.insert({
				id: fact.agentId,
				role: "smoother",
				status: "spawning",
				currentSessionId: fact.sessionId,
				createdAt: at,
				updatedAt: at,
			});
			if (fact.voyageId !== null)
				yield* rows.voyageAgent.insert({
					id: voyageAgentId(fact.voyageId, fact.agentId),
					voyageId: fact.voyageId,
					agentId: fact.agentId,
					role: "smoother",
				});
		} else yield* rows.agent.update(fact.agentId, { status: "alive", currentSessionId: fact.sessionId, updatedAt: at });
	}),
});
