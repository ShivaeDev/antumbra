import { claim as command } from "@antumbra/domain-reclamation/commands/claim.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const claim = Effect.fn("Reclamation.claim")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
