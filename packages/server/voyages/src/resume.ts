import { resume as command } from "@antumbra/domain-voyages/commands/resume.ts";
import { VoyageHistory } from "@antumbra/server-storage/voyages/service.ts";
import { Effect } from "effect";

export const resume = Effect.fn("Voyages.resume")(function* (input: typeof command.Input.Type) {
	const history = yield* VoyageHistory;
	if ((yield* history.byId(input.id)) === null) return yield* command.reject.Unknown({ id: input.id });
	return yield* history.append(input.requestId, { _tag: "QuietSet", id: input.id, quietedAt: null });
});
