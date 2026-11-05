import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { smoothingSessionFinished } from "#facts/smoothing-session-finished.ts";
import { smoothingSession } from "#rows/smoothing-session.ts";

export const finishSmoothingSession = command("finishSmoothingSession", {
	input: smoothingSessionFinished.payload,
	reads: [smoothingSession],
	emits: smoothingSessionFinished,
	rejections: { UnknownSession: { id: Schema.String }, Settled: { id: Schema.String } },
});
