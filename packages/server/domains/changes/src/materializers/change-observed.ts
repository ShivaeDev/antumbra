import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { changeObserved } from "#facts/change-observed.ts";
import { storeChange, storedRows, storeTransition } from "#materializers/store.ts";
export const changeObservedMaterializer = materializer(changeObserved, {
	writes: storedRows,
	run: Effect.fn("changes.changeObserved")(function* (fact, rows) {
		if (fact.change !== null) yield* storeChange(rows, fact.change);
		yield* storeTransition(rows, fact.transition);
	}),
});
