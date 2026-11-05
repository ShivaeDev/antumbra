import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import { storeChange, storeFeedback, storeTransition } from "#changes/store.ts";

export const projectChangeObserved = Effect.fn("ChangesHistory.projectChangeObserved")(function* (
	fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeObserved" }>,
) {
	if (fact.change !== null) yield* storeChange(fact.change);
	yield* storeTransition(fact.transition);
	yield* storeFeedback(fact.feedback);
});
