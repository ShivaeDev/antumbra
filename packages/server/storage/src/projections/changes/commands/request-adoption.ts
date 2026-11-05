import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeAdoptionRequestedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const adoptionRequested = fact("ChangeAdoptionRequested", ChangeAdoptionRequestedPayload.fields);
export const adoptionRequestedMaterializer = Effect.fn("changes.adoptionRequested")(function* (
	fact: FactValue<typeof adoptionRequested>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.changeAdoptionRequest.insertVoid(fact).pipe(Effect.orDie);
});
