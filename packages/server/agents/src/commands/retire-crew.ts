import { retireCrew as command } from "@antumbra/domain-agents/commands/retire-crew.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const retireCrew = Effect.fn("Agents.retireCrew")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
