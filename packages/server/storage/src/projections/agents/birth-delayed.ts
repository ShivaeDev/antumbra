import type { birthDelayed } from "@antumbra/domain-agents/facts/birth-delayed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const birthDelayedMaterializer = Effect.fn("Agents.BirthDelayed")(function* (
	fact: FactValue<typeof birthDelayed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.birth.updateVoid({ ...{ detail: fact.reason }, id: fact.id }).pipe(Effect.orDie);
});
