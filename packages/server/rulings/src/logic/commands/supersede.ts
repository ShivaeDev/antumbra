import { standing } from "@antumbra/domain-rulings/commands/guard.ts";
import type * as Source from "@antumbra/domain-rulings/commands/supersede.ts";
import { RulingId } from "@antumbra/domain-rulings/ids.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const supersede = Effect.fn("rulings.supersede")(function* (
	input: typeof Source.supersede.Input.Type,
	reject: typeof Source.supersede.reject,
): Effect.fn.Return<typeof Source.supersede.emits.Payload.Type, RejectedBy<typeof Source.supersede.rejections>, Records> {
	const rows = yield* Records;

	if (input.rulingId === input.byRulingId) return yield* reject.Self({ rulingId: input.rulingId });
	for (const rulingId of [input.rulingId, RulingId.make(input.byRulingId)]) {
		const found = yield* rows.ruling
			.findOne({ where: { id: rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
			.pipe(Effect.orDie);
		if (Option.isNone(found)) return yield* reject.Unknown({ rulingId });
		if (found.value.answer === null) return yield* reject.NotRuled({ rulingId });
		if (!standing(found.value)) return yield* reject.Retired({ rulingId });
	}
	return { ...input, byRulingId: RulingId.make(input.byRulingId) };
});
