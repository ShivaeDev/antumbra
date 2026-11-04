import { withdraw as command } from "@antumbra/domain-rulings/commands/withdraw.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const withdraw = Effect.fn("Rulings.withdraw")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
