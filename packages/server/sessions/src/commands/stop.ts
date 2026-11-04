import { stop as command } from "@antumbra/domain-sessions/commands/stop.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const stop = Effect.fn("Sessions.stop")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
