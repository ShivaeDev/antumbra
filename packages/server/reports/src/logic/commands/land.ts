import type * as Source from "@antumbra/domain-reports/commands/land.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { ReportId } from "@antumbra/platform-vocabulary/reports-ids.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Clock, Effect } from "effect";

export const land = Effect.fn("reports.land")(function* (
	input: typeof Source.land.Input.Type,
	reject: typeof Source.land.reject,
): Effect.fn.Return<typeof Source.land.emits.Payload.Type, RejectedBy<typeof Source.land.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.piece.count({ where: { id: input.pieceId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.PieceNotFound({ pieceId: input.pieceId });
	const at = yield* Clock.currentTimeMillis;
	return {
		id: ReportId.make(input.requestId),
		authorAgentId: input.authorAgentId,
		body: input.body,
		title: input.title,
		pieceId: input.pieceId,
		createdAt: new Date(at).toISOString(),
	};
});
