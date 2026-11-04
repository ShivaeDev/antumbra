import { stoppedLoops as query } from "@antumbra/domain-supervision/queries/stopped-loops.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const stoppedLoops = Effect.fn("Supervision.stoppedLoops")(function* (input: Parameters<typeof query.run>[0]) {
	return yield* query.run(input, yield* (yield* ExecutionHistory).rowsFor(query.reads), {});
});
