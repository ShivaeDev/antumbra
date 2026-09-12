import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { resourcesClaimed } from "#facts/resources-claimed.ts";
import { reclaimRequestId } from "#ids.ts";
import { berth } from "#rows/berth.ts";
import { moorage } from "#rows/moorage.ts";

export const resourcesClaimedMaterializer = materializer(resourcesClaimed, {
	writes: [moorage, berth],
	run: Effect.fn("Reclamation.resourcesClaimed")(function* (fact, rows) {
		yield* rows.moorage.update(fact.agentId, { reclaimState: "claimed" });
		for (const id of fact.berthIds) {
			yield* rows.berth.update(id, { reclaimRequestId: reclaimRequestId(fact.requestId, id), reclaimResult: null, reclaimState: "claimed" });
		}
	}),
});
