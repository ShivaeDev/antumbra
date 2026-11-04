import { admit as command } from "@antumbra/domain-agents/commands/admit.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const admit = Effect.fn("Agents.admit")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
