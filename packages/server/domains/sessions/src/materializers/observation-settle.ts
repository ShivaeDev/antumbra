import { Effect, Option } from "effect";
import { SessionOperationId } from "#ids.ts";
import type { Observation, Rows, Session } from "#materializers/observation-types.ts";

const receiptStatus = (evidence: Observation["evidence"]): "ambiguous" | "waiting" | "accepted" => {
	if (evidence.type === "input-ambiguous") return "ambiguous";
	if (evidence.type === "failed" || evidence.type === "input-failed") return "waiting";
	return "accepted";
};
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
	if (
		fact.operationId !== null &&
		["slept", "ended", "failed", "input-accepted", "input-failed", "input-ambiguous", "interrupted"].includes(evidence.type)
	) {
		const id = SessionOperationId.make(fact.operationId);
		const operation = yield* rows.sessionOperation.find(id);
		if (Option.isNone(operation) || operation.value.status === "cancelled") return;
		yield* rows.sessionOperation.update(id, {
			status: receiptStatus(evidence),
			detail: "reason" in evidence ? evidence.reason : null,
		});
	}
});
