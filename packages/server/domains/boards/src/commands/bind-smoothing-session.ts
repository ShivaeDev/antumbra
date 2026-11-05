import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { smoothingSessionBound } from "#facts/smoothing-session-bound.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

export const bindSmoothingSession = command("bindSmoothingSession", {
	input: smoothingSessionBound.payload,
	reads: [smoothingAttempt],
	emits: smoothingSessionBound,
	rejections: { UnknownAttempt: { id: Schema.String } },
});
