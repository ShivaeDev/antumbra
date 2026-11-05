import { quiet as command } from "@antumbra/domain-voyages/commands/quiet.ts";
import { VoyageHistory } from "@antumbra/server-storage/voyages/service.ts";
import { Clock, Effect } from "effect";

export const quiet = Effect.fn("Voyages.quiet")(function* (input: typeof command.Input.Type) {
	const history = yield* VoyageHistory;
	if ((yield* history.byId(input.id)) === null) return yield* command.reject.Unknown({ id: input.id });
	const at = yield* Clock.currentTimeMillis;
	return yield* history.append(input.requestId, { _tag: "QuietSet", id: input.id, quietedAt: new Date(at).toISOString() });
});
