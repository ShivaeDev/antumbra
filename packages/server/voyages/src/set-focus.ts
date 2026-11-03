import { setFocus as command } from "@antumbra/domain-voyages/commands/set-focus.ts";
import { VoyageHistory } from "@antumbra/server-journal/postgres/voyages/service.ts";
import { Clock, Effect } from "effect";

export const setFocus = Effect.fn("Voyages.setFocus")(function* (input: typeof command.Input.Type) {
	const history = yield* VoyageHistory;
	if ((yield* history.byId(input.id)) === null) return yield* command.reject.Unknown({ id: input.id });
	const at = yield* Clock.currentTimeMillis;
	return yield* history.append(input.requestId, { _tag: "FocusSet", id: input.id, focusedAt: input.focused ? new Date(at).toISOString() : null });
});
