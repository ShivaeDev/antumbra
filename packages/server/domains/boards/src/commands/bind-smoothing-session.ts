import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { smoothingSessionBound } from "#facts/smoothing-session-bound.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

export const bindSmoothingSession = command("bindSmoothingSession", {
	input: smoothingSessionBound.payload,
	reads: [smoothingAttempt],
	emits: smoothingSessionBound,
	rejections: { UnknownAttempt: { id: Schema.String } },
	run: Effect.fn("boards.bindSmoothingSession")(function* (input, rows, reject) {
		if (!(yield* rows.smoothingAttempt.exists(input.attemptId))) return yield* reject.UnknownAttempt({ id: input.attemptId });
		return {
			sessionId: input.sessionId,
			attemptId: input.attemptId,
			agentId: input.agentId,
			board: input.board,
			pieceId: input.pieceId,
			title: input.title,
			level: input.level,
			coversFrom: input.coversFrom,
			coversTo: input.coversTo,
		};
	}),
});
