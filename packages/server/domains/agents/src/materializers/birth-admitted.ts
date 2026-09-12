import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { birthAdmitted } from "#facts/birth-admitted.ts";
import { birth } from "#rows/birth.ts";
export const birthAdmittedMaterializer = materializer(birthAdmitted, {
	writes: [birth],
	run: Effect.fn("Agents.BirthAdmitted")(function* (fact, rows) {
		yield* rows.birth.update(fact.id, {
			status: "admitted",
			detail: null,
			backend: fact.backend,
			model: fact.model,
			effort: fact.effort,
			admittedAt: new Date(fact.at).toISOString(),
		});
	}),
});
