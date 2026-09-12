import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { startHeld } from "#facts/start-held.ts";
import { StartId } from "#ids.ts";
import { start } from "#rows/start.ts";
export const hold = command("hold", {
	input: { id: StartId, reason: Schema.String },
	reads: [start],
	emits: startHeld,
	rejections: { Unavailable: { id: Schema.String } },
	run: Effect.fn("Starts.hold")(function* (input, rows, reject) {
		const held = yield* rows.start.find(input.id);
		if (Option.isNone(held) || held.value.status !== "admitted") return yield* reject.Unavailable({ id: input.id });
		return { id: input.id, reason: input.reason };
	}),
});
