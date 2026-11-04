import { byVoyage as query } from "@antumbra/domain-agents/queries/by-voyage.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const byVoyage = Effect.fn("Agents.byVoyage")(function* (input: Parameters<typeof query.run>[0]) {
	return yield* query.run(input, yield* (yield* ExecutionHistory).rowsFor(query.reads), {});
});
