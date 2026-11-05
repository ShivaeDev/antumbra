import type * as Source from "@antumbra/domain-boards/commands/bind-smoothing-session.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";

export const bindSmoothingSession = Effect.fn("boards.bindSmoothingSession")(function* (
	input: typeof Source.bindSmoothingSession.Input.Type,
	reject: typeof Source.bindSmoothingSession.reject,
): Effect.fn.Return<typeof Source.bindSmoothingSession.emits.Payload.Type, RejectedBy<typeof Source.bindSmoothingSession.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.smoothingAttempt.count({ where: { id: input.attemptId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownAttempt({ id: input.attemptId });
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
});
