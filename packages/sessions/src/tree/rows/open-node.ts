import { Database, type NewAgentSession, type StoredAgentSession } from "@antumbra/persistence";
import { Effect } from "effect";

interface NodeOpening {
	readonly kind: string | null;
	readonly label: string | null;
	readonly sessionId: string;
	readonly spawnerSessionId: string;
}

export const openNode = Effect.fn("SessionTreeRows.openNode")(function* (root: StoredAgentSession, node: NodeOpening) {
	const db = yield* Database;
	return yield* db.AgentSession.create({
		agentId: root.agentId,
		backend: root.backend,
		charterDeliveredAt: null,
		completeness: "recording",
		cwd: root.cwd,
		executionStatus: "active",
		id: node.sessionId,
		kind: node.kind,
		label: node.label,
		nativeRef: null,
		outcome: null,
		parentSessionId: node.spawnerSessionId,
		rootSessionId: root.rootSessionId,
		status: "open",
	} satisfies NewAgentSession).pipe(Effect.asVoid);
});
