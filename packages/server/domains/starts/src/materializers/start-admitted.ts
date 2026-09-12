import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { startAdmitted } from "#facts/start-admitted.ts";
import { start } from "#rows/start.ts";
export const startAdmittedMaterializer = materializer(startAdmitted, {
	writes: [start],
	run: Effect.fn("Starts.StartAdmitted")(function* (fact, rows) {
		yield* rows.start.update(fact.id, { status: "admitted", detail: null, admittedAt: new Date(fact.at).toISOString() });
	}),
});
