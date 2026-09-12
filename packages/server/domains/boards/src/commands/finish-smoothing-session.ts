import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { smoothingSessionFinished } from "#facts/smoothing-session-finished.ts";
import { smoothingSession } from "#rows/smoothing-session.ts";

export const finishSmoothingSession = command("finishSmoothingSession", {
	input: smoothingSessionFinished.payload,
	reads: [smoothingSession],
	emits: smoothingSessionFinished,
	rejections: { UnknownSession: { id: Schema.String }, Settled: { id: Schema.String } },
	run: Effect.fn("boards.finishSmoothingSession")(function* (input, rows, reject) {
		const held = yield* rows.smoothingSession.find(input.sessionId);
		if (Option.isNone(held)) return yield* reject.UnknownSession({ id: input.sessionId });
		if (held.value.status !== "waiting") return yield* reject.Settled({ id: input.sessionId });
		return { sessionId: input.sessionId, status: input.status };
	}),
});
