import type { rulingSuperseded } from "@antumbra/domain-rulings/facts/ruling-superseded.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const rulingSupersededMaterializer = Effect.fn("rulings.rulingSuperseded")(function* (
	fact: FactValue<typeof rulingSuperseded>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const at = new Date(fact.at).toISOString();
	yield* rows.ruling.updateVoid({ ...{ supersession: { byRulingId: fact.byRulingId, by: fact.by, at } }, id: fact.rulingId }).pipe(Effect.orDie);
});
