import { spawn as command } from "@antumbra/domain-agents/commands/spawn.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const spawn = Effect.fn("Agents.spawn")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
