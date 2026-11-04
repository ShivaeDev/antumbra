import { charter as command } from "@antumbra/domain-sessions/commands/charter.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const charter = Effect.fn("Sessions.charter")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
