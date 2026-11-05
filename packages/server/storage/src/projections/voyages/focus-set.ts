import type { focusSet } from "@antumbra/domain-voyages/facts/focus-set.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const focusSetMaterializer = Effect.fn("voyages.FocusSet")(function* (
	fact: FactValue<typeof focusSet>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.voyage.updateVoid({ ...{ focusedAt: fact.focusedAt }, id: fact.id }).pipe(Effect.orDie);
});
