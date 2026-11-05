import type { rulingWithdrawn } from "@antumbra/domain-rulings/facts/ruling-withdrawn.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const rulingWithdrawnMaterializer = Effect.fn("rulings.rulingWithdrawn")(function* (
	fact: FactValue<typeof rulingWithdrawn>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const at = new Date(fact.at).toISOString();
	yield* rows.ruling.updateVoid({ ...{ withdrawal: { note: fact.note, by: fact.by, at } }, id: fact.rulingId }).pipe(Effect.orDie);
});
