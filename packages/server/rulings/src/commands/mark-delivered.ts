import { markDelivered as command } from "@antumbra/domain-rulings/commands/mark-delivered.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const markDelivered = Effect.fn("Rulings.markDelivered")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
