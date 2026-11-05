import type { smoothingRequested } from "@antumbra/domain-agents/facts/smoothing-requested.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { voyageAgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const smoothingRequestedMaterializer = Effect.fn("Agents.SmoothingRequested")(function* (
	fact: FactValue<typeof smoothingRequested>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const at = new Date(fact.at).toISOString();
	yield* rows.birth
		.insertVoid({
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
		})
		.pipe(Effect.orDie);
	if (fact.createsAgent) {
		yield* rows.agent
			.insertVoid({
				id: fact.agentId,
				role: "smoother",
				status: "spawning",
				currentSessionId: fact.sessionId,
				createdAt: at,
				updatedAt: at,
			})
			.pipe(Effect.orDie);
		if (fact.voyageId !== null)
			yield* rows.voyageAgent
				.insertVoid({
					id: voyageAgentId(fact.voyageId, fact.agentId),
					voyageId: fact.voyageId,
					agentId: fact.agentId,
					role: "smoother",
				})
				.pipe(Effect.orDie);
	} else
		yield* rows.agent.updateVoid({ ...{ status: "alive", currentSessionId: fact.sessionId, updatedAt: at }, id: fact.agentId }).pipe(Effect.orDie);
});
