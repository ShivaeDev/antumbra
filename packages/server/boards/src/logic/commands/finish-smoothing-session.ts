import type * as Source from "@antumbra/domain-boards/commands/finish-smoothing-session.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as smoothingSessionSelection } from "@antumbra/server-storage/records/smoothing-session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";

export const finishSmoothingSession = Effect.fn("boards.finishSmoothingSession")(function* (
	input: typeof Source.finishSmoothingSession.Input.Type,
	reject: typeof Source.finishSmoothingSession.reject,
): Effect.fn.Return<typeof Source.finishSmoothingSession.emits.Payload.Type, RejectedBy<typeof Source.finishSmoothingSession.rejections>, Records> {
	const rows = yield* Records;

	const held = yield* rows.smoothingSession
		.findOne({ where: { sessionId: input.sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: smoothingSessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(held)) return yield* reject.UnknownSession({ id: input.sessionId });
	if (held.value.status !== "waiting") return yield* reject.Settled({ id: input.sessionId });
	return { sessionId: input.sessionId, status: input.status };
});
