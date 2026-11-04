import { awaitingAscent as query } from "@antumbra/domain-rulings/queries/awaiting-ascent.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const awaitingAscent = Effect.fn("Rulings.awaitingAscent")(function* (input: Parameters<typeof query.run>[0]) {
	return yield* query.run(input, yield* (yield* ExecutionHistory).rowsFor(query.reads), {});
});
