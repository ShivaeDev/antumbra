import { answer as command } from "@antumbra/domain-rulings/commands/answer.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const answer = Effect.fn("Rulings.answer")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
