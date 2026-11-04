import { retry as command } from "@antumbra/domain-sessions/commands/retry.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const retry = Effect.fn("Sessions.retry")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
