import { ready as command } from "@antumbra/domain-reclamation/commands/ready.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const ready = Effect.fn("Reclamation.ready")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
