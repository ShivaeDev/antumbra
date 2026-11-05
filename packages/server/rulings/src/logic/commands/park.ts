import type * as Source from "@antumbra/domain-rulings/commands/park.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const park = Effect.fn("rulings.park")(function* (
	input: typeof Source.park.Input.Type,
	reject: typeof Source.park.reject,
): Effect.fn.Return<typeof Source.park.emits.Payload.Type, RejectedBy<typeof Source.park.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.ruling
		.findOne({ where: { id: input.rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
	const current = found.value;
	if (current.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });
	if (current.parked !== null) return yield* reject.AlreadyParked({ rulingId: input.rulingId });
	return input;
});
