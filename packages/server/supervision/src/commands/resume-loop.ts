import { resumeLoop as command } from "@antumbra/domain-supervision/commands/loop-resumed.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const resumeLoop = Effect.fn("Supervision.resumeLoop")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
