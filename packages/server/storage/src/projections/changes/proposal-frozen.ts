import type { proposalFrozen } from "@antumbra/domain-changes/facts/proposal-frozen.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { storeChange } from "#projections/changes/store.ts";
import type { Records } from "#records.ts";
export const proposalFrozenMaterializer = Effect.fn("changes.proposalFrozen")(function* (
	fact: FactValue<typeof proposalFrozen>,
): Effect.fn.Return<void, never, Records> {
	yield* storeChange(fact.change);
});
