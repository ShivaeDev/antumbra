import type { birthAdmitted } from "@antumbra/domain-agents/facts/birth-admitted.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const birthAdmittedMaterializer = Effect.fn("Agents.BirthAdmitted")(function* (
	fact: FactValue<typeof birthAdmitted>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.birth
		.updateVoid({
			...{
				status: "admitted",
				detail: null,
				backend: fact.backend,
				model: fact.model,
				effort: fact.effort,
				admittedAt: new Date(fact.at).toISOString(),
			},
			id: fact.id,
		})
		.pipe(Effect.orDie);
});
