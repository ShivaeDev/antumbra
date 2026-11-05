import { Effect } from "effect";
import type { Observation } from "#projections/sessions/observation-types.ts";
import { Records } from "#records.ts";
export const start = Effect.fn("sessions.start")(function* (fact: Observation) {
	const rows = yield* Records;

	const evidence = fact.evidence;
	const at = new Date(fact.at).toISOString();
	if (evidence.type === "started" || evidence.type === "failed") {
		const requestId = fact.operationId ?? fact.requestId;
		const result = { requestId, sessionId: fact.sessionId, status: evidence.type, reason: evidence.type === "failed" ? evidence.reason : null };
		if (
			yield* rows.sessionStartResult.count({ where: { requestId: requestId } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			yield* rows.sessionStartResult.updateVoid({ ...result, requestId: requestId }).pipe(Effect.orDie);
		else yield* rows.sessionStartResult.insertVoid(result).pipe(Effect.orDie);
	}
	if (evidence.type === "started") {
		yield* rows.session
			.insertVoid({
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
				stoppedAt: null,
				openDelegations: 0,
				toolCalls: 0,
				createdAt: at,
			})
			.pipe(Effect.orDie);
		return;
	}
});
