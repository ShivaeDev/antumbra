import type { rulingDelivered } from "@antumbra/domain-rulings/facts/ruling-delivered.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const rulingDeliveredMaterializer = Effect.fn("rulings.rulingDelivered")(function* (
	fact: FactValue<typeof rulingDelivered>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const at = new Date(fact.at).toISOString();
	yield* rows.ruling.updateVoid({ ...{ deliveredAt: at }, id: fact.rulingId }).pipe(Effect.orDie);
});
