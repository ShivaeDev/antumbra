import type { birthRetried } from "@antumbra/domain-agents/facts/birth-retried.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const birthRetriedMaterializer = Effect.fn("Agents.BirthRetried")(function* (
	fact: FactValue<typeof birthRetried>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.birth.updateVoid({ ...{ status: "requested", operationRequestId: fact.requestId, detail: null }, id: fact.id }).pipe(Effect.orDie);
});
