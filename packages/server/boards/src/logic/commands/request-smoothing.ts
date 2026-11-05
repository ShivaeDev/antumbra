import type * as Source from "@antumbra/domain-boards/commands/request-smoothing.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Clock, Effect, Option } from "effect";
export const requestSmoothing = Effect.fn("boards.requestSmoothing")(function* (
	input: typeof Source.requestSmoothing.Input.Type,
	reject: typeof Source.requestSmoothing.reject,
): Effect.fn.Return<typeof Source.requestSmoothing.emits.Payload.Type, RejectedBy<typeof Source.requestSmoothing.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.voyage.count({ where: { id: input.voyageId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownVoyage({ id: input.voyageId });
	if (input.pieceId !== null) {
		const held = yield* rows.piece
			.findOne({ where: { id: input.pieceId }, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection })
			.pipe(Effect.orDie);
		if (Option.isNone(held) || held.value.voyageId !== input.voyageId) return yield* reject.WrongPiece({ id: input.pieceId });
	}
	return {
		id: input.requestId,
		voyageId: input.voyageId,
		pieceId: input.pieceId,
		throughToday: input.throughToday,
		by: input.by,
		requestedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
	};
});
