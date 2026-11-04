import { gate as command } from "@antumbra/domain-rulings/commands/gate.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const gate = Effect.fn("Rulings.gate")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
