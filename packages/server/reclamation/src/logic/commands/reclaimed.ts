import type * as Source from "@antumbra/domain-reclamation/commands/reclaimed.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";

export const reclaimed = Effect.fn("Reclamation.reclaimed")(function* (
	input: typeof Source.reclaimed.Input.Type,
	reject: typeof Source.reclaimed.reject,
): Effect.fn.Return<typeof Source.reclaimed.emits.Payload.Type, RejectedBy<typeof Source.reclaimed.rejections>, Records> {
	const rows = yield* Records;

	const stored = yield* rows.berth
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(stored) || stored.value.reclaimRequestId !== input.claimRequestId) return yield* reject.StaleClaim({ id: input.id });
	return { id: input.id, claimRequestId: input.claimRequestId };
});
