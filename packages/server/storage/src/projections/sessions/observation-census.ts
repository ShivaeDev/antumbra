import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Effect } from "effect";
import type { Observation, Session } from "#projections/sessions/observation-types.ts";
import { Records } from "#records.ts";
export const census = Effect.fn("Sessions.census")(function* (fact: Observation, root: Session) {
	const rows = yield* Records;

	if (fact.evidence.type !== "census") return;
	const nodes = yield* rows.session
		.findMany({ where: { rootSessionId: root.rootSessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	for (const found of fact.evidence.nodes) {
		const node = nodes.find((node) => node.nativeRef === found.nativeRef);
		if (node === undefined) continue;
		yield* rows.session
			.updateVoid({
				...{
					attached: found.working,
					executionStatus: found.working ? "active" : "idle",
					...(found.working ? { status: "open", completeness: "recording", idleSince: null } : {}),
				},
				id: node.id,
			})
			.pipe(Effect.orDie);
	}
});
