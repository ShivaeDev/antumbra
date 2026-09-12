import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { berthReclaimFailed } from "#facts/berth-reclaim-failed.ts";
import { berth } from "#rows/berth.ts";

export const berthReclaimFailedMaterializer = materializer(berthReclaimFailed, {
	writes: [berth],
	run: Effect.fn("Reclamation.berthReclaimFailed")(function* (fact, rows) {
		const stored = yield* rows.berth.get(fact.id);
		if (stored.reclaimRequestId !== fact.claimRequestId) return;
		yield* rows.berth.update(fact.id, { reclaimResult: "failed" });
	}),
});
