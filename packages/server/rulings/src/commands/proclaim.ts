import { proclaim as command } from "@antumbra/domain-rulings/commands/proclaim.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const proclaim = Effect.fn("Rulings.proclaim")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
