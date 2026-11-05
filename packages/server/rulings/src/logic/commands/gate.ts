import type * as Source from "@antumbra/domain-rulings/commands/gate.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const gate = Effect.fn("rulings.gate")(function* (
	input: typeof Source.gate.Input.Type,
	reject: typeof Source.gate.reject,
): Effect.fn.Return<typeof Source.gate.emits.Payload.Type, RejectedBy<typeof Source.gate.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.ruling
		.findOne({ where: { id: input.rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
	if (found.value.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });
	for (const pieceId of input.pieceIds)
		if (
			!(yield* rows.piece.count({ where: { id: pieceId } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			))
		)
			return yield* reject.PieceMissing({ pieceId });
	return input;
});
