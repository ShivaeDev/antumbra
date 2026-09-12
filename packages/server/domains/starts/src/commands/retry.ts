import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { startRetried } from "#facts/start-retried.ts";
import { StartId } from "#ids.ts";
import { start } from "#rows/start.ts";
export const retry = command("retry", {
	input: { id: StartId },
	reads: [start],
	emits: startRetried,
	rejections: { Unknown: { id: Schema.String }, NotAllowed: { id: Schema.String, status: Schema.String } },
	run: Effect.fn("Starts.retry")(function* (input, rows, reject) {
		const held = yield* rows.start.find(input.id);
		if (Option.isNone(held)) return yield* reject.Unknown({ id: input.id });
		if (held.value.status !== "waiting") return yield* reject.NotAllowed({ id: input.id, status: held.value.status });
		return { id: input.id };
	}),
});
