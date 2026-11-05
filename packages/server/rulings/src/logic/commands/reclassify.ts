import type * as Source from "@antumbra/domain-rulings/commands/reclassify.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const reclassify = Effect.fn("rulings.reclassify")(function* (
	input: typeof Source.reclassify.Input.Type,
	reject: typeof Source.reclassify.reject,
): Effect.fn.Return<typeof Source.reclassify.emits.Payload.Type, RejectedBy<typeof Source.reclassify.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.ruling
		.findOne({ where: { id: input.rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
	const current = found.value;
	if (current.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });
	if (input.radius === null && input.urgency === null) return yield* reject.Empty({ rulingId: input.rulingId });
	return input;
});
