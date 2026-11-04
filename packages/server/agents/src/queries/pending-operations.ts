import { pendingOperations as query } from "@antumbra/domain-agents/queries/pending-operations.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const pendingOperations = Effect.fn("Agents.pendingOperations")(function* (input: Parameters<typeof query.run>[0]) {
	return yield* query.run(input, yield* (yield* ExecutionHistory).rowsFor(query.reads), {});
});
