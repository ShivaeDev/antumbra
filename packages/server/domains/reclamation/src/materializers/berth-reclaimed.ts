import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { berthReclaimed } from "#facts/berth-reclaimed.ts";
import { berth } from "#rows/berth.ts";
import { moorage } from "#rows/moorage.ts";

export const berthReclaimedMaterializer = materializer(berthReclaimed, {
	writes: [berth, moorage],
	run: Effect.fn("Reclamation.berthReclaimed")(function* (fact, rows) {
		const stored = yield* rows.berth.get(fact.id);
		yield* rows.berth.update(fact.id, { status: "reclaimed", reclaimState: null, reclaimRequestId: null, strandedAt: null });
		const siblings = yield* rows.berth.where({ agentId: stored.agentId });
		if (!siblings.some((sibling) => sibling.reclaimState === "claimed")) yield* rows.moorage.update(stored.agentId, { reclaimState: null });
	}),
});
