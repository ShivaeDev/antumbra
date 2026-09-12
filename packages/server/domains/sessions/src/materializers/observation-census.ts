import { Effect } from "effect";
import type { Observation, Rows, Session } from "#materializers/observation-types.ts";
export const census = Effect.fn("Sessions.census")(function* (fact: Observation, rows: Rows, root: Session) {
	if (fact.evidence.type !== "census") return;
	const nodes = yield* rows.session.where({ rootSessionId: root.rootSessionId });
	for (const found of fact.evidence.nodes) {
		const node = nodes.find((node) => node.nativeRef === found.nativeRef);
		if (node === undefined) continue;
		yield* rows.session.update(node.id, {
			attached: found.working,
			executionStatus: found.working ? "active" : "idle",
			...(found.working ? { status: "open", completeness: "recording", idleSince: null } : {}),
		});
	}
});
