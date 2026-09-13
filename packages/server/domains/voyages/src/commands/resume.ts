import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { quietSet } from "#facts/quiet-set.ts";
import { VoyageId } from "#ids.ts";
import { voyage } from "#rows/voyage.ts";

export const resume = command("resume", {
	input: { id: VoyageId },
	reads: [voyage],
	emits: quietSet,
	rejections: { Unknown: { id: Schema.String } },
	run: Effect.fn("voyages.resume")(function* (input, rows, reject) {
		if (!(yield* rows.voyage.exists(input.id))) return yield* reject.Unknown({ id: input.id });
		return { id: input.id, quietedAt: null };
	}),
});
