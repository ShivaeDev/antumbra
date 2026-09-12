import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { changeAdopted } from "#facts/change-adopted.ts";
import { storeChange, storedRows, storeLink, storeTransition } from "#materializers/store.ts";
export const changeAdoptedMaterializer = materializer(changeAdopted, {
	writes: storedRows,
	run: Effect.fn("changes.changeAdopted")(function* (fact, rows) {
		yield* storeChange(rows, fact.change);
		yield* storeLink(rows, fact.link);
		yield* storeTransition(rows, fact.transition);
	}),
});
