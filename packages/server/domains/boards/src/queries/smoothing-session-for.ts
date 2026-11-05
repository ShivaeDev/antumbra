import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";
import { smoothingSession } from "#rows/smoothing-session.ts";

export const smoothingSessionFor = query("smoothingSessionFor", {
	input: { sessionId: Schema.String },
	output: Schema.NullOr(Schema.Struct({ ...smoothingSession.fields, voyageId: smoothingAttempt.fields.voyageId })),
	reads: [smoothingSession, smoothingAttempt],
});
