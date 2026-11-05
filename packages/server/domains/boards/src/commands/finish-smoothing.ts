import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { smoothingFinished } from "#facts/smoothing-finished.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

export const finishSmoothing = command("finishSmoothing", {
	input: smoothingFinished.payload,
	reads: [smoothingAttempt],
	emits: smoothingFinished,
	rejections: { UnknownAttempt: { id: Schema.String } },
});
