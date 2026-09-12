import { pieceAgentId, voyageAgentId } from "@antumbra/domain-agents/ids.ts";
import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { pieceAgent } from "@antumbra/domain-agents/rows/piece-agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { startRequested } from "#facts/start-requested.ts";
import { start } from "#rows/start.ts";
export const startRequestedMaterializer = materializer(startRequested, {
	writes: [start, agent, pieceAgent, voyageAgent, sessionOperation],
	run: Effect.fn("Starts.StartRequested")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		if (fact.wakeSessionId !== null) {
			yield* rows.sessionOperation.insert({
				id: SessionOperationId.make(fact.requestId),
				sessionId: fact.wakeSessionId,
				kind: "wake",
				inputId: null,
				reason: "hail",
				status: "requested",
				detail: null,
				requestedAt: at,
			});
			return;
		}
		yield* rows.start.insert({
			id: fact.id,
			operationRequestId: fact.requestId,
			agentId: fact.agentId,
			sessionId: fact.sessionId,
			voyageId: fact.voyageId,
			pieceId: fact.pieceId,
			backend: fact.backend,
			model: fact.model,
			effort: fact.effort,
			role: fact.role,
			charter: fact.charter,
			toolSetVersion: fact.toolSetVersion,
			status: "requested",
			detail: null,
			requestedAt: at,
			admittedAt: null,
		});
		yield* rows.agent.insert({
			id: fact.agentId,
			role: fact.role,
			charter: fact.charter,
			status: "spawning",
			currentSessionId: fact.sessionId,
			createdAt: at,
			updatedAt: at,
		});
		if (fact.pieceId !== null)
			yield* rows.pieceAgent.insert({ id: pieceAgentId(fact.pieceId, fact.agentId), pieceId: fact.pieceId, agentId: fact.agentId, assignedAt: at });
		if (fact.voyageId !== null)
			yield* rows.voyageAgent.insert({
				id: voyageAgentId(fact.voyageId, fact.agentId),
				voyageId: fact.voyageId,
				agentId: fact.agentId,
				role: fact.role,
			});
	}),
});
