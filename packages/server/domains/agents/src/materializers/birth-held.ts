import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { birthHeld } from "#facts/birth-held.ts";
import { birth } from "#rows/birth.ts";
export const birthHeldMaterializer = materializer(birthHeld, {
	writes: [birth],
	run: Effect.fn("Agents.BirthHeld")(function* (fact, rows) {
		yield* rows.birth.update(fact.id, { status: "waiting", detail: fact.reason });
	}),
});
