import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { changeAdopted } from "#facts/change-adopted.ts";
import { storeChange, storedRows, storeLink, storeTransition } from "#materializers/store.ts";
import { adoptionRequest } from "#rows/adoption-request.ts";
export const changeAdoptedMaterializer = materializer(changeAdopted, {
	writes: [...storedRows, adoptionRequest],
	run: Effect.fn("changes.changeAdopted")(function* (fact, rows) {
		yield* storeChange(rows, fact.change);
		yield* storeLink(rows, fact.link);
		yield* storeTransition(rows, fact.transition);
		if (fact.adoptionId !== null) yield* rows.changeAdoptionRequest.delete(fact.adoptionId);
	}),
});
