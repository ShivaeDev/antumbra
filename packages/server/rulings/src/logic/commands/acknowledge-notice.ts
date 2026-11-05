import type * as Source from "@antumbra/domain-rulings/commands/acknowledge-notice.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const acknowledgeNotice = Effect.fn("rulings.acknowledgeNotice")(function* (
	input: typeof Source.acknowledgeNotice.Input.Type,
	reject: typeof Source.acknowledgeNotice.reject,
): Effect.fn.Return<typeof Source.acknowledgeNotice.emits.Payload.Type, RejectedBy<typeof Source.acknowledgeNotice.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.ruling.count({ where: { id: input.rulingId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.Unknown({ rulingId: input.rulingId });
	return input;
});
