import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { birthRequested } from "#facts/birth-requested.ts";
import { pieceAgentId, voyageAgentId } from "#ids.ts";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const birthRequestedMaterializer = materializer(birthRequested, {
	writes: [birth, agent, pieceAgent, voyageAgent, sessionOperation],
	run: Effect.fn("Agents.BirthRequested")(function* (fact, rows) {
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
		yield* rows.birth.insert({
			id: fact.id,
			operationRequestId: fact.requestId,
			createsAgent: true,
			cwd: null,
			agentId: fact.agentId,
			sessionId: fact.sessionId,
			voyageId: fact.voyageId,
			pieceId: fact.pieceId,
			backend: fact.backend,
			model: fact.model,
			effort: fact.effort,
			role: fact.role,
			source: fact.source,
			status: "requested",
			detail: null,
			requestedAt: at,
			admittedAt: null,
		});
		yield* rows.agent.insert({
			id: fact.agentId,
			role: fact.role,
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
