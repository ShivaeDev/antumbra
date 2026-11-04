import { passUp as command } from "@antumbra/domain-rulings/commands/pass-up.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const passUp = Effect.fn("Rulings.passUp")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
