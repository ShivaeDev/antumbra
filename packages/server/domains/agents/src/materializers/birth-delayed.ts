import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { birthDelayed } from "#facts/birth-delayed.ts";
import { birth } from "#rows/birth.ts";
export const birthDelayedMaterializer = materializer(birthDelayed, {
	writes: [birth],
	run: Effect.fn("Agents.BirthDelayed")(function* (fact, rows) {
		yield* rows.birth.update(fact.id, { detail: fact.reason });
	}),
});
