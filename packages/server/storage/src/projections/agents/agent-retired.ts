import type { agentRetired } from "@antumbra/domain-agents/facts/agent-retired.ts";
import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const agentRetiredMaterializer = Effect.fn("Agents.AgentRetired")(function* (
	fact: FactValue<typeof agentRetired>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const at = new Date(fact.at).toISOString();
	yield* rows.agent.updateVoid({ ...{ status: "retired", currentSessionId: null, updatedAt: at }, id: fact.id }).pipe(Effect.orDie);
	const roots = yield* rows.session
		.findMany({
			where: { agentId: fact.id, parentSessionId: null, status: "open" },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionSelection,
		})
		.pipe(Effect.orDie);
	for (const root of roots) {
		yield* rows.sessionOperation
			.insertVoid({
				id: SessionOperationId.make(`${fact.requestId}:${root.id}`),
				sessionId: root.id,
				kind: "stop",
				inputId: null,
				reason: "retirement",
				status: "requested",
				detail: null,
				requestedAt: at,
				sequence: fact.seq,
				gatedBy: null,
			})
			.pipe(Effect.orDie);
	}
});
