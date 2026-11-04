import { claims as query } from "@antumbra/domain-reclamation/queries/claims.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const claims = Effect.fn("Reclamation.claims")(function* (input: Parameters<typeof query.run>[0]) {
	return yield* query.run(input, yield* (yield* ExecutionHistory).rowsFor(query.reads), {});
});
