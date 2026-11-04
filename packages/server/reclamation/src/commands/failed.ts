import { failed as command } from "@antumbra/domain-reclamation/commands/failed.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const failed = Effect.fn("Reclamation.failed")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
