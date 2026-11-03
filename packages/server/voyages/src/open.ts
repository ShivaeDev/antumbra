import { open as command } from "@antumbra/domain-voyages/commands/open.ts";
import { VoyageHistory } from "@antumbra/server-journal/postgres/voyages/service.ts";
import { Effect } from "effect";

export const open = Effect.fn("Voyages.open")(function* (input: typeof command.Input.Type) {
	const history = yield* VoyageHistory;
	const event = yield* command.run(input, {}, command.reject);
	return yield* history.append(input.requestId, { _tag: "VoyageOpened", ...event });
});
