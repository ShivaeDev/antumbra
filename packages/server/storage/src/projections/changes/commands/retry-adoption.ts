import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeAdoptionRetriedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const adoptionRetried = fact("ChangeAdoptionRetried", ChangeAdoptionRetriedPayload.fields);
export const adoptionRetriedMaterializer = Effect.fn("changes.adoptionRetried")(function* (
	fact: FactValue<typeof adoptionRetried>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.changeAdoptionRequest.updateVoid({ ...{ url: fact.url, error: null }, id: fact.id }).pipe(Effect.orDie);
});
