import type { birthHeld } from "@antumbra/domain-agents/facts/birth-held.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const birthHeldMaterializer = Effect.fn("Agents.BirthHeld")(function* (
	fact: FactValue<typeof birthHeld>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.birth.updateVoid({ ...{ status: "waiting", detail: fact.reason }, id: fact.id }).pipe(Effect.orDie);
});
