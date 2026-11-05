import type { birthRequested } from "@antumbra/domain-agents/facts/birth-requested.ts";
import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { pieceAgentId, voyageAgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const birthRequestedMaterializer = Effect.fn("Agents.BirthRequested")(function* (
	fact: FactValue<typeof birthRequested>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const at = new Date(fact.at).toISOString();
	if (fact.wakeSessionId !== null) {
		yield* rows.session.updateVoid({ ...{ stoppedAt: null }, id: fact.wakeSessionId }).pipe(Effect.orDie);
		yield* rows.sessionOperation
			.insertVoid({
				id: SessionOperationId.make(fact.requestId),
				sessionId: fact.wakeSessionId,
				kind: "wake",
				inputId: null,
				reason: "hail",
				status: "requested",
				detail: null,
				requestedAt: at,
				sequence: fact.seq,
				gatedBy: fact.source === "hail" ? "wakeOnHail" : null,
			})
			.pipe(Effect.orDie);
		return;
	}
	yield* rows.birth
		.insertVoid({
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
		})
		.pipe(Effect.orDie);
	yield* rows.agent
		.insertVoid({
			id: fact.agentId,
			role: fact.role,
			status: "spawning",
			currentSessionId: fact.sessionId,
			createdAt: at,
			updatedAt: at,
		})
		.pipe(Effect.orDie);
	if (fact.pieceId !== null)
		yield* rows.pieceAgent
			.insertVoid({ id: pieceAgentId(fact.pieceId, fact.agentId), pieceId: fact.pieceId, agentId: fact.agentId, assignedAt: at })
			.pipe(Effect.orDie);
	if (fact.voyageId !== null)
		yield* rows.voyageAgent
			.insertVoid({
				id: voyageAgentId(fact.voyageId, fact.agentId),
				voyageId: fact.voyageId,
				agentId: fact.agentId,
				role: fact.role,
			})
			.pipe(Effect.orDie);
});
