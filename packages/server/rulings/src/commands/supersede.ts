import { supersede as command } from "@antumbra/domain-rulings/commands/supersede.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const supersede = Effect.fn("Rulings.supersede")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
