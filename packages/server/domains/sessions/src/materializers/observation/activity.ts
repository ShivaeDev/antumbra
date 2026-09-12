import { Effect } from "effect";
import type { Observation, Rows, Session } from "#materializers/observation/types.ts";
export const activity = Effect.fn("sessions.activity")(function* (fact: Observation, rows: Rows, current: Session, nodes: readonly Session[]) {
	const evidence = fact.evidence;
	const at = new Date(fact.at).toISOString();

	if (evidence.type === "native") yield* rows.session.update(current.id, { nativeRef: evidence.nativeRef });
	if (evidence.type === "activity")
		yield* rows.session.update(current.id, { executionStatus: evidence.state, idleSince: evidence.state === "idle" ? at : null });
	if (evidence.type === "background") yield* rows.session.update(current.id, { openDelegations: evidence.count });
	if (evidence.type === "gap") {
		yield* rows.sessionGap.insert({ id: `${fact.seq}:gap`, sessionId: current.id, kind: evidence.kind, detail: evidence.detail, observedAt: at });
		yield* rows.session.update(current.id, { completeness: "incomplete" });
	}
	if (evidence.type === "woke")
		yield* rows.session.update(current.id, { attached: true, runnerId: evidence.runnerId, executionStatus: "active", idleSince: null });
	if (evidence.type === "detached") yield* rows.session.update(current.id, { attached: false });
	if (evidence.type === "slept") yield* rows.session.update(current.id, { attached: false, executionStatus: "idle", idleSince: at });
	if (evidence.type === "ended") {
		for (const node of nodes) yield* rows.session.update(node.id, { attached: false, status: "closed", executionStatus: "idle", idleSince: at });
	}
});
