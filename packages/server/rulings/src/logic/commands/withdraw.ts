import type * as Source from "@antumbra/domain-rulings/commands/withdraw.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const withdraw = Effect.fn("rulings.withdraw")(function* (
	input: typeof Source.withdraw.Input.Type,
	reject: typeof Source.withdraw.reject,
): Effect.fn.Return<typeof Source.withdraw.emits.Payload.Type, RejectedBy<typeof Source.withdraw.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.ruling
		.findOne({ where: { id: input.rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
	const current = found.value;
	if (current.answer === null) return yield* reject.NotRuled({ rulingId: input.rulingId });
	if (current.supersession !== null || current.withdrawal !== null) return yield* reject.Retired({ rulingId: input.rulingId });
	return input;
});
