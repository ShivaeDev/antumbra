import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { mooragePlanned } from "#facts/moorage-planned.ts";
import { berthId } from "#ids.ts";
import { berth } from "#rows/berth.ts";
import { moorage } from "#rows/moorage.ts";

export const mooragePlannedMaterializer = materializer(mooragePlanned, {
	writes: [moorage, berth],
	run: Effect.fn("Reclamation.mooragePlanned")(function* (fact, rows) {
		if (yield* rows.moorage.exists(fact.agentId)) return;
		yield* rows.moorage.insert({ agentId: fact.agentId, runner: fact.runner, root: fact.plan.root, status: "provisioning", reclaimState: null });
		for (const planned of fact.plan.berths) {
			yield* rows.berth.insert({
				...planned,
				id: berthId(fact.agentId, planned.slug),
				agentId: fact.agentId,
				runner: fact.runner,
				status: "provisioning",
				reclaimState: null,
				reclaimRequestId: null,
				strandedAt: null,
			});
		}
	}),
});
