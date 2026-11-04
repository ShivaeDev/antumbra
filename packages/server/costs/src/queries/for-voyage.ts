import { forVoyage as query } from "@antumbra/domain-costs/queries/for-voyage.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const forVoyage = Effect.fn("Costs.forVoyage")(function* (input: Parameters<typeof query.run>[0]) {
	return yield* query.run(input, yield* (yield* ExecutionHistory).rowsFor(query.reads), {});
});
