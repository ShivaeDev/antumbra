import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Effect, Option } from "effect";
import type { Observation, Session } from "#projections/sessions/observation-types.ts";
import { Records } from "#records.ts";

const receiptStatus = (evidence: Observation["evidence"]): "ambiguous" | "waiting" | "accepted" => {
	if (evidence.type === "input-ambiguous") return "ambiguous";
	if (evidence.type === "failed" || evidence.type === "input-failed") return "waiting";
	return "accepted";
};
export const settle = Effect.fn("sessions.settle")(function* (fact: Observation, current: Session) {
	const rows = yield* Records;

	const evidence = fact.evidence;
	const at = new Date(fact.at).toISOString();

	if (evidence.type === "input-accepted") {
		yield* rows.session
			.updateVoid({
				...{
					executionStatus: "active",
					idleSince: null,
					...(fact.operationId === current.startRequestId ? { charterDeliveredAt: at } : {}),
				},
				id: current.id,
			})
			.pipe(Effect.orDie);
	}
	if (
		fact.operationId !== null &&
		["slept", "ended", "failed", "input-accepted", "input-failed", "input-ambiguous", "interrupted"].includes(evidence.type)
	) {
		const id = SessionOperationId.make(fact.operationId);
		const operation = yield* rows.sessionOperation
			.findOne({ where: { id: id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
			.pipe(Effect.orDie);
		if (Option.isNone(operation) || operation.value.status === "cancelled") return;
		yield* rows.sessionOperation
			.updateVoid({
				...{
					status: receiptStatus(evidence),
					detail: "reason" in evidence ? evidence.reason : null,
				},
				id: id,
			})
			.pipe(Effect.orDie);
	}
});
