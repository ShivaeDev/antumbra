import type * as Source from "@antumbra/domain-reclamation/commands/failed.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";

export const failed = Effect.fn("Reclamation.failed")(function* (
	input: typeof Source.failed.Input.Type,
	reject: typeof Source.failed.reject,
): Effect.fn.Return<typeof Source.failed.emits.Payload.Type, RejectedBy<typeof Source.failed.rejections>, Records> {
	const rows = yield* Records;

	const stored = yield* rows.berth
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(stored) || stored.value.reclaimRequestId !== input.claimRequestId) return yield* reject.StaleClaim({ id: input.id });
	return { id: input.id, claimRequestId: input.claimRequestId, reason: input.reason };
});
