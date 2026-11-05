import type { changeAdopted } from "@antumbra/domain-changes/facts/change-adopted.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { storeChange, storeLink, storeTransition } from "#projections/changes/store.ts";
import { Records } from "#records.ts";
export const changeAdoptedMaterializer = Effect.fn("changes.changeAdopted")(function* (
	fact: FactValue<typeof changeAdopted>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* storeChange(fact.change);
	yield* storeLink(fact.link);
	yield* storeTransition(fact.transition);
	if (fact.adoptionId !== null) yield* rows.changeAdoptionRequest.delete(fact.adoptionId).pipe(Effect.orDie);
});
