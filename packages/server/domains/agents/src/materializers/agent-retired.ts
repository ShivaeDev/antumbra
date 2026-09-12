import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { agentRetired } from "#facts/agent-retired.ts";
import { agent } from "#rows/agent.ts";
export const agentRetiredMaterializer = materializer(agentRetired, {
	writes: [agent, session, sessionOperation],
	run: Effect.fn("Agents.AgentRetired")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		yield* rows.agent.update(fact.id, { status: "retired", currentSessionId: null, updatedAt: at });
		const roots = yield* rows.session.where({ agentId: fact.id, parentSessionId: null, status: "open" });
		for (const root of roots) {
			yield* rows.sessionOperation.insert({
				id: SessionOperationId.make(`${fact.requestId}:${root.id}`),
				sessionId: root.id,
				kind: "stop",
				inputId: null,
				reason: "retirement",
				status: "requested",
				detail: null,
				requestedAt: at,
			});
		}
	}),
});
