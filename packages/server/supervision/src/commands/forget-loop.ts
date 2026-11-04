import { forgetLoop as command } from "@antumbra/domain-supervision/commands/loop-forgotten.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const forgetLoop = Effect.fn("Supervision.forgetLoop")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
