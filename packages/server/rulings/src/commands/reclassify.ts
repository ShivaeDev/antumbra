import { reclassify as command } from "@antumbra/domain-rulings/commands/reclassify.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const reclassify = Effect.fn("Rulings.reclassify")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
