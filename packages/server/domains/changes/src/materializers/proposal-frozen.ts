import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { proposalFrozen } from "#facts/proposal-frozen.ts";
import { storeChange, storedRows } from "#materializers/store.ts";
export const proposalFrozenMaterializer = materializer(proposalFrozen, {
	writes: storedRows,
	run: Effect.fn("changes.proposalFrozen")(function* (fact, rows) {
		yield* storeChange(rows, fact.change);
	}),
});
