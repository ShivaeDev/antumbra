import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { smoothingFinished } from "#facts/smoothing-finished.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

export const finishSmoothing = command("finishSmoothing", {
	input: smoothingFinished.payload,
	reads: [smoothingAttempt],
	emits: smoothingFinished,
	rejections: { UnknownAttempt: { id: Schema.String } },
	run: Effect.fn("boards.finishSmoothing")(function* (input, rows, reject) {
		if (!(yield* rows.smoothingAttempt.exists(input.id))) return yield* reject.UnknownAttempt({ id: input.id });
		return { id: input.id, status: input.status, detail: input.detail };
	}),
});
