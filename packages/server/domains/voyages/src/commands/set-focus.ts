import { command } from "@antumbra/platform-feature/command.ts";
import { Clock, Effect, Schema } from "effect";
import { focusSet } from "#facts/focus-set.ts";
import { VoyageId } from "#ids.ts";
import { voyage } from "#rows/voyage.ts";

export const setFocus = command("setFocus", {
	input: { id: VoyageId, focused: Schema.Boolean },
	reads: [voyage],
	emits: focusSet,
	rejections: { Unknown: { id: Schema.String } },
	run: Effect.fn("voyages.setFocus")(function* (input, rows, reject) {
		if (!(yield* rows.voyage.exists(input.id))) {
			return yield* reject.Unknown({ id: input.id });
		}
		const at = yield* Clock.currentTimeMillis;
		return { focusedAt: input.focused ? new Date(at).toISOString() : null, id: input.id };
	}),
});
