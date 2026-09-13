import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { quietSet } from "#facts/quiet-set.ts";
import { voyage } from "#rows/voyage.ts";

export const quietSetMaterializer = materializer(quietSet, {
	writes: [voyage],
	run: Effect.fn("voyages.QuietSet")(function* (fact, rows) {
		yield* rows.voyage.update(fact.id, { quietedAt: fact.quietedAt });
	}),
});
