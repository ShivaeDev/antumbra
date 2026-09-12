import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";

export const smoothingSessionFinished = fact("SmoothingSessionFinished", {
	sessionId: Schema.String,
	status: Schema.Literals(["written", "empty", "silent", "timedOut"]),
});
