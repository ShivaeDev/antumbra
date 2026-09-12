import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { moorageReady } from "#facts/moorage-ready.ts";
import { berth } from "#rows/berth.ts";
import { moorage } from "#rows/moorage.ts";

export const moorageReadyMaterializer = materializer(moorageReady, {
	writes: [moorage, berth],
	run: Effect.fn("Reclamation.moorageReady")(function* (fact, rows) {
		yield* rows.moorage.update(fact.agentId, { status: "ready" });
		for (const site of yield* rows.berth.where({ agentId: fact.agentId })) yield* rows.berth.update(site.id, { status: "ready" });
	}),
});
