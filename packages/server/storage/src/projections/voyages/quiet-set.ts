import type { quietSet } from "@antumbra/domain-voyages/facts/quiet-set.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const quietSetMaterializer = Effect.fn("voyages.QuietSet")(function* (
	fact: FactValue<typeof quietSet>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.voyage.updateVoid({ ...{ quietedAt: fact.quietedAt }, id: fact.id }).pipe(Effect.orDie);
});
