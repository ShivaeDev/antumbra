import { smooth as command } from "@antumbra/domain-agents/commands/smooth.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const smooth = Effect.fn("Agents.smooth")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
