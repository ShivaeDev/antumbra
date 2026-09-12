import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { birthDelayed } from "#facts/birth-delayed.ts";
import { BirthId } from "#ids.ts";
import { birth } from "#rows/birth.ts";
export const delay = command("delay", {
	input: { id: BirthId, reason: Schema.String },
	reads: [birth],
	emits: birthDelayed,
	rejections: { Unavailable: { id: Schema.String } },
	run: Effect.fn("Agents.delay")(function* (input, rows, reject) {
		const held = yield* rows.birth.find(input.id);
		if (Option.isNone(held) || held.value.status !== "requested") return yield* reject.Unavailable({ id: input.id });
		return { id: input.id, reason: input.reason };
	}),
});
