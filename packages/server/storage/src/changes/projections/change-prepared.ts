import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import { storeChange, storeLink } from "#changes/store.ts";

export const projectChangePrepared = Effect.fn("ChangesHistory.projectChangePrepared")(function* (
	fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangePrepared" }>,
) {
	yield* storeChange(fact.change);
	yield* storeLink(fact.link);
});
