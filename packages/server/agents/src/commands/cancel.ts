import { cancel as command } from "@antumbra/domain-agents/commands/cancel.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const cancel = Effect.fn("Agents.cancel")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
