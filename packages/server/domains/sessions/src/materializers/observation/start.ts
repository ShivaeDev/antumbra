import { Effect } from "effect";
import type { Observation, Rows } from "#materializers/observation/types.ts";
export const start = Effect.fn("sessions.start")(function* (fact: Observation, rows: Rows) {
	const evidence = fact.evidence;
	const at = new Date(fact.at).toISOString();
	if (evidence.type === "started" || evidence.type === "failed") {
		const requestId = fact.operationId ?? fact.requestId;
		const result = { requestId, sessionId: fact.sessionId, status: evidence.type, reason: evidence.type === "failed" ? evidence.reason : null };
		if (yield* rows.sessionStartResult.exists(requestId)) yield* rows.sessionStartResult.update(requestId, result);
		else yield* rows.sessionStartResult.insert(result);
	}
	if (evidence.type === "started") {
		yield* rows.session.insert({
			id: fact.sessionId,
			agentId: evidence.agentId,
			backend: evidence.backend,
			cwd: evidence.cwd,
			nativeRef: evidence.nativeRef,
			status: "open",
			executionStatus: "idle",
			completeness: "recording",
			outcome: null,
			label: null,
			kind: null,
			parentSessionId: null,
			rootSessionId: fact.sessionId,
			runnerId: evidence.runnerId,
			toolSetVersion: evidence.toolSetVersion,
			startRequestId: fact.operationId ?? fact.requestId,
			charterDeliveredAt: null,
			attached: true,
			idleSince: at,
			openDelegations: 0,
			toolCalls: 0,
			createdAt: at,
		});
		return;
	}
});
