import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { birthCancelled } from "#facts/birth-cancelled.ts";
import { BirthId } from "#ids.ts";
import { birth } from "#rows/birth.ts";
export const cancel = command("cancel", {
	input: { id: BirthId },
	reads: [birth],
	emits: birthCancelled,
	rejections: { Unknown: { id: Schema.String }, NotAllowed: { id: Schema.String, status: Schema.String } },
	run: Effect.fn("Agents.cancel")(function* (input, rows, reject) {
		const held = yield* rows.birth.find(input.id);
		if (Option.isNone(held)) return yield* reject.Unknown({ id: input.id });
		if (held.value.status !== "requested" && held.value.status !== "waiting")
			return yield* reject.NotAllowed({ id: input.id, status: held.value.status });
		return { id: input.id };
	}),
});
