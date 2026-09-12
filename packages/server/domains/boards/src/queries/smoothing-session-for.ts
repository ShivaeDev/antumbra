import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";
import { smoothingSession } from "#rows/smoothing-session.ts";

export const smoothingSessionFor = query("smoothingSessionFor", {
	input: { sessionId: Schema.String },
	output: Schema.NullOr(Schema.Struct({ ...smoothingSession.fields, voyageId: smoothingAttempt.fields.voyageId })),
	reads: [smoothingSession, smoothingAttempt],
	run: Effect.fn("boards.smoothingSessionFor")(function* (input, rows) {
		const held = yield* rows.smoothingSession.find(input.sessionId);
		if (Option.isNone(held)) return null;
		const attempt = yield* rows.smoothingAttempt.get(held.value.attemptId);
		return { ...held.value, voyageId: attempt.voyageId };
	}),
});
