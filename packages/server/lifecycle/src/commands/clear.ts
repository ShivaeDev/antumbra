import { clear as command } from "@antumbra/domain-lifecycle/commands/clear.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const clear = Effect.fn("Lifecycle.clear")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
