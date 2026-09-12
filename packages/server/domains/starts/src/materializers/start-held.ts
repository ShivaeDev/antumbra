import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { startHeld } from "#facts/start-held.ts";
import { start } from "#rows/start.ts";
export const startHeldMaterializer = materializer(startHeld, {
	writes: [start],
	run: Effect.fn("Starts.StartHeld")(function* (fact, rows) {
		yield* rows.start.update(fact.id, { status: "waiting", detail: fact.reason });
	}),
});
