import { retryable as query } from "@antumbra/domain-reclamation/queries/retryable.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const retryable = Effect.fn("Reclamation.retryable")(function* (input: Parameters<typeof query.run>[0]) {
	return yield* query.run(input, yield* (yield* ExecutionHistory).rowsFor(query.reads), {});
});
