import { hail as command } from "@antumbra/domain-agents/commands/hail.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const hail = Effect.fn("Agents.hail")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
