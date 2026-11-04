import { observe as command } from "@antumbra/domain-capacity/commands/observe.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const observe = Effect.fn("Capacity.observe")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
