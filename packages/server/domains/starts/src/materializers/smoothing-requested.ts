import { voyageAgentId } from "@antumbra/domain-agents/ids.ts";
import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { smoothingRequested } from "#facts/smoothing-requested.ts";
import { start } from "#rows/start.ts";
export const smoothingRequestedMaterializer = materializer(smoothingRequested, {
	writes: [start, agent, voyageAgent],
	run: Effect.fn("Starts.SmoothingRequested")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		yield* rows.start.insert({
			id: fact.id,
			operationRequestId: fact.requestId,
			createsAgent: fact.createsAgent,
			constrainedPrompt: fact.constrainedPrompt,
			cwd: fact.cwd,
			source: fact.source,
			agentId: fact.agentId,
			sessionId: fact.sessionId,
			voyageId: fact.voyageId,
			pieceId: null,
			backend: fact.backend,
			model: fact.model,
			effort: fact.effort,
			role: fact.role,
			charter: fact.charter,
			toolSetVersion: fact.toolSetVersion,
			tools: fact.tools,
			status: "requested",
			detail: null,
			requestedAt: at,
			admittedAt: null,
		});
		if (fact.createsAgent) {
			yield* rows.agent.insert({
				id: fact.agentId,
				role: "smoother",
				charter: fact.constrainedPrompt ?? fact.charter,
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
