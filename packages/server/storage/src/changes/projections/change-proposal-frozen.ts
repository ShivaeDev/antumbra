import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import { storeChange } from "#changes/store.ts";

export const projectChangeProposalFrozen = Effect.fn("ChangesHistory.projectChangeProposalFrozen")(function* (
	fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeProposalFrozen" }>,
) {
	yield* storeChange(fact.change);
});
