import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Effect } from "effect";
import type { Observation, Session } from "#projections/sessions/observation-types.ts";
import { Records } from "#records.ts";
export const activity = Effect.fn("sessions.activity")(function* (fact: Observation, current: Session, nodes: readonly Session[]) {
	const rows = yield* Records;

	const evidence = fact.evidence;
	const at = new Date(fact.at).toISOString();

	if (evidence.type === "native") yield* rows.session.updateVoid({ ...{ nativeRef: evidence.nativeRef }, id: current.id }).pipe(Effect.orDie);
	if (evidence.type === "activity" && fact.live)
		yield* rows.session
			.updateVoid({ ...{ executionStatus: evidence.state, idleSince: evidence.state === "idle" ? at : null }, id: current.id })
			.pipe(Effect.orDie);
	if (evidence.type === "background" && fact.live)
		yield* rows.session.updateVoid({ ...{ openDelegations: evidence.count }, id: current.id }).pipe(Effect.orDie);
	if (evidence.type === "gap") {
		yield* rows.sessionGap
			.insertVoid({ id: `${fact.seq}:gap`, sessionId: current.id, kind: evidence.kind, detail: evidence.detail, observedAt: at })
			.pipe(Effect.orDie);
		yield* rows.session.updateVoid({ ...{ completeness: "incomplete" }, id: current.id }).pipe(Effect.orDie);
	}
	if (evidence.type === "woke")
		yield* rows.session.updateVoid({ ...{ attached: true, runnerId: evidence.runnerId }, id: current.id }).pipe(Effect.orDie);
	if (evidence.type === "detached") yield* rows.session.updateVoid({ ...{ attached: false }, id: current.id }).pipe(Effect.orDie);
	if (evidence.type === "slept")
		yield* rows.session.updateVoid({ ...{ attached: false, executionStatus: "idle", idleSince: at }, id: current.id }).pipe(Effect.orDie);
	yield* end(fact, current, nodes);
});

const end = Effect.fn("Sessions.endTree")(function* (fact: Observation, current: Session, nodes: readonly Session[]) {
	const rows = yield* Records;

	const evidence = fact.evidence;
	const at = new Date(fact.at).toISOString();
	if (evidence.type !== "ended") return;
	for (const node of nodes)
		yield* rows.session
			.updateVoid({ ...{ attached: false, status: "closed", executionStatus: "idle", idleSince: at }, id: node.id })
			.pipe(Effect.orDie);
	const operations = yield* rows.sessionOperation
		.findMany({
			where: { sessionId: current.rootSessionId },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionOperationSelection,
		})
		.pipe(Effect.orDie);
	for (const operation of operations) {
		if (operation.id !== fact.operationId && (operation.status === "requested" || operation.status === "waiting"))
			yield* rows.sessionOperation.updateVoid({ ...{ status: "cancelled", detail: evidence.reason }, id: operation.id }).pipe(Effect.orDie);
	}
});
