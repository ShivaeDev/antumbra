import { acknowledgeNotice as command } from "@antumbra/domain-rulings/commands/acknowledge-notice.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const acknowledgeNotice = Effect.fn("Rulings.acknowledgeNotice")(function* (input: typeof command.Input.Type) {
	return yield* (yield* ExecutionHistory).commit(command, input);
});
