import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { birthRetried } from "#facts/birth-retried.ts";
import { BirthId } from "#ids.ts";
import { birth } from "#rows/birth.ts";
export const retry = command("retry", {
	input: { id: BirthId },
	reads: [birth],
	emits: birthRetried,
	rejections: { Unknown: { id: Schema.String }, NotAllowed: { id: Schema.String, status: Schema.String } },
	run: Effect.fn("Agents.retry")(function* (input, rows, reject) {
		const held = yield* rows.birth.find(input.id);
		if (Option.isNone(held)) return yield* reject.Unknown({ id: input.id });
		if (held.value.status !== "waiting") return yield* reject.NotAllowed({ id: input.id, status: held.value.status });
		return { id: input.id };
	}),
});
