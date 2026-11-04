import { reclaimed as command } from "@antumbra/domain-reclamation/commands/reclaimed.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const reclaimed = Effect.fn("Reclamation.reclaimed")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
