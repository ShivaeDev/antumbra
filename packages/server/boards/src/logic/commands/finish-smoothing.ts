import type * as Source from "@antumbra/domain-boards/commands/finish-smoothing.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";

export const finishSmoothing = Effect.fn("boards.finishSmoothing")(function* (
	input: typeof Source.finishSmoothing.Input.Type,
	reject: typeof Source.finishSmoothing.reject,
): Effect.fn.Return<typeof Source.finishSmoothing.emits.Payload.Type, RejectedBy<typeof Source.finishSmoothing.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.smoothingAttempt.count({ where: { id: input.id } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownAttempt({ id: input.id });
	return { id: input.id, status: input.status, detail: input.detail };
});
