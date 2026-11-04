import { plan as command } from "@antumbra/domain-reclamation/commands/plan.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const plan = Effect.fn("Reclamation.plan")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
