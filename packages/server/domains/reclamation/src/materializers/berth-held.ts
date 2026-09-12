import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { berthHeld } from "#facts/berth-held.ts";
import { berth } from "#rows/berth.ts";

export const berthHeldMaterializer = materializer(berthHeld, {
	writes: [berth],
	run: Effect.fn("Reclamation.berthHeld")(function* (fact, rows) {
		const stored = yield* rows.berth.get(fact.id);
		yield* rows.berth.update(fact.id, { status: "stranded", strandedAt: stored.strandedAt ?? fact.at });
	}),
});
