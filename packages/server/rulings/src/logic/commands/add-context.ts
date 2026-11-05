import type * as Source from "@antumbra/domain-rulings/commands/add-context.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const addContext = Effect.fn("rulings.addContext")(function* (
	input: typeof Source.addContext.Input.Type,
	reject: typeof Source.addContext.reject,
): Effect.fn.Return<typeof Source.addContext.emits.Payload.Type, RejectedBy<typeof Source.addContext.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.ruling
		.findOne({ where: { id: input.rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
	const current = found.value;
	if (current.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });

	return input;
});
