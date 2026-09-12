import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { changePrepared } from "#facts/change-prepared.ts";
import { storeChange, storedRows, storeLink } from "#materializers/store.ts";
export const changePreparedMaterializer = materializer(changePrepared, {
	writes: storedRows,
	run: Effect.fn("changes.changePrepared")(function* (fact, rows) {
		yield* storeChange(rows, fact.change);
		yield* storeLink(rows, fact.link);
	}),
});
