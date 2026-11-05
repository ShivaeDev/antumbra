import type { changePrepared } from "@antumbra/domain-changes/facts/change-prepared.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { storeChange, storeLink } from "#projections/changes/store.ts";
import type { Records } from "#records.ts";
export const changePreparedMaterializer = Effect.fn("changes.changePrepared")(function* (
	fact: FactValue<typeof changePrepared>,
): Effect.fn.Return<void, never, Records> {
	yield* storeChange(fact.change);
	yield* storeLink(fact.link);
});
