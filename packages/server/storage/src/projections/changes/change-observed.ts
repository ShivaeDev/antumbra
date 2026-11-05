import type { changeObserved } from "@antumbra/domain-changes/facts/change-observed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { storeChange, storeFeedback, storeTransition } from "#projections/changes/store.ts";
import type { Records } from "#records.ts";
export const changeObservedMaterializer = Effect.fn("changes.changeObserved")(function* (
	fact: FactValue<typeof changeObserved>,
): Effect.fn.Return<void, never, Records> {
	if (fact.change !== null) yield* storeChange(fact.change);
	yield* storeTransition(fact.transition);
	yield* storeFeedback(fact.feedback);
});
