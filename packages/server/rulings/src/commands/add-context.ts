import { addContext as command } from "@antumbra/domain-rulings/commands/add-context.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const addContext = Effect.fn("Rulings.addContext")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
