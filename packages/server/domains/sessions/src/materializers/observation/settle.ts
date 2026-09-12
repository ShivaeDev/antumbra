import { Effect } from "effect";
import { SessionOperationId } from "#ids.ts";
import type { Observation, Rows, Session } from "#materializers/observation/types.ts";
export const settle = Effect.fn("sessions.settle")(function* (fact: Observation, rows: Rows, current: Session) {
	const evidence = fact.evidence;
	const at = new Date(fact.at).toISOString();

	if (evidence.type === "input-accepted") {
		yield* rows.session.update(current.id, {
			executionStatus: "active",
			idleSince: null,
			...(fact.operationId === current.startRequestId ? { charterDeliveredAt: at } : {}),
		});
	}
	if (fact.operationId !== null && ["woke", "slept", "ended", "failed", "input-accepted", "interrupted"].includes(evidence.type)) {
		const id = SessionOperationId.make(fact.operationId);
		if (yield* rows.sessionOperation.exists(id))
			yield* rows.sessionOperation.update(id, {
				status: evidence.type === "failed" ? "waiting" : "accepted",
				detail: evidence.type === "failed" ? evidence.reason : null,
			});
	}
});
