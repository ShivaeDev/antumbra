import type * as Source from "@antumbra/domain-rulings/commands/mark-delivered.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const markDelivered = Effect.fn("rulings.markDelivered")(function* (
	input: typeof Source.markDelivered.Input.Type,
	reject: typeof Source.markDelivered.reject,
): Effect.fn.Return<typeof Source.markDelivered.emits.Payload.Type, RejectedBy<typeof Source.markDelivered.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.ruling
		.findOne({ where: { id: input.rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });

	return input;
});
