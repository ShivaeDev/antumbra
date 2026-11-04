import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";
import { storeChange, storeFeedback, storeTransition } from "#postgres/changes/store.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeObserved = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeObserved")(function* (fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeObserved" }>) {
		if (fact.change !== null) yield* storeChange(rows, fact.change);
		yield* storeTransition(rows, fact.transition);
		yield* storeFeedback(rows, fact.feedback);
	});
