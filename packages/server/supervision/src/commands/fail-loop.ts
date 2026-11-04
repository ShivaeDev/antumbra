import { failLoop as command } from "@antumbra/domain-supervision/commands/loop-failed.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const failLoop = Effect.fn("Supervision.failLoop")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
