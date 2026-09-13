import { command } from "@antumbra/platform-feature/command.ts";
import { Clock, Effect, Schema } from "effect";
import { quietSet } from "#facts/quiet-set.ts";
import { VoyageId } from "#ids.ts";
import { voyage } from "#rows/voyage.ts";

export const quiet = command("quiet", {
	input: { id: VoyageId },
	reads: [voyage],
	emits: quietSet,
	rejections: { Unknown: { id: Schema.String } },
	run: Effect.fn("voyages.quiet")(function* (input, rows, reject) {
		if (!(yield* rows.voyage.exists(input.id))) return yield* reject.Unknown({ id: input.id });
		const at = yield* Clock.currentTimeMillis;
		return { id: input.id, quietedAt: new Date(at).toISOString() };
	}),
});
