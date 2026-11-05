import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeAdoptionFailedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const adoptionFailed = fact("ChangeAdoptionFailed", ChangeAdoptionFailedPayload.fields);
export const adoptionFailedMaterializer = Effect.fn("changes.adoptionFailed")(function* (
	fact: FactValue<typeof adoptionFailed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	if (fact.id !== null) yield* rows.changeAdoptionRequest.updateVoid({ ...{ error: fact.message }, id: fact.id }).pipe(Effect.orDie);
});
