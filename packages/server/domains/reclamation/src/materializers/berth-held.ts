import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { berthHeld } from "#facts/berth-held.ts";
import { berth } from "#rows/berth.ts";

export const berthHeldMaterializer = materializer(berthHeld, {
	writes: [berth],
	run: Effect.fn("Reclamation.berthHeld")(function* (fact, rows) {
		const stored = yield* rows.berth.get(fact.id);
		if (stored.reclaimRequestId !== fact.claimRequestId) return;
		yield* rows.berth.update(fact.id, { reclaimResult: "held", status: "stranded", strandedAt: stored.strandedAt ?? fact.at });
	}),
});
