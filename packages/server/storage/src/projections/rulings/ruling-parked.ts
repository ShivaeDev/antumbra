import type { rulingParked } from "@antumbra/domain-rulings/facts/ruling-parked.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const rulingParkedMaterializer = Effect.fn("rulings.rulingParked")(function* (
	fact: FactValue<typeof rulingParked>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const at = new Date(fact.at).toISOString();
	yield* rows.ruling.updateVoid({ ...{ parked: { note: fact.note, at } }, id: fact.rulingId }).pipe(Effect.orDie);
});
