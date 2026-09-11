import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { focusSet } from "#facts/focus-set.ts";
import { voyage } from "#rows/voyage.ts";

export const focusSetMaterializer = materializer(focusSet, {
	writes: [voyage],
	run: Effect.fn("voyages.FocusSet")(function* (fact, rows) {
		yield* rows.voyage.update(fact.id, { focusedAt: fact.focusedAt });
	}),
});
