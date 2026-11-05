import type { inputDeliveryChanged } from "@antumbra/domain-inputs/facts/delivery.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const changed = Effect.fn("inputs.InputDeliveryChanged")(function* (
	fact: FactValue<typeof inputDeliveryChanged>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.sessionInput.updateVoid({ ...{ status: fact.status, detail: fact.detail }, id: fact.id }).pipe(Effect.orDie);
});
