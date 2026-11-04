import { workingCount as query } from "@antumbra/domain-agents/queries/working-count.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const workingCount = Effect.fn("Agents.workingCount")(function* (input: Parameters<typeof query.run>[0]) {
	return yield* query.run(input, yield* (yield* ExecutionHistory).rowsFor(query.reads), {});
});
