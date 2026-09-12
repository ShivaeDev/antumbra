import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { birthHeld } from "#facts/birth-held.ts";
import { BirthId } from "#ids.ts";
import { birth } from "#rows/birth.ts";
export const hold = command("hold", {
	input: { id: BirthId, reason: Schema.String },
	reads: [birth],
	emits: birthHeld,
	rejections: { Unavailable: { id: Schema.String } },
	run: Effect.fn("Agents.hold")(function* (input, rows, reject) {
		const held = yield* rows.birth.find(input.id);
		if (Option.isNone(held) || held.value.status !== "admitted") return yield* reject.Unavailable({ id: input.id });
		return { id: input.id, reason: input.reason };
	}),
});
