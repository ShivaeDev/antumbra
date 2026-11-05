import type * as Source from "@antumbra/domain-inputs/commands/delivery.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as sessionInputSelection } from "@antumbra/server-storage/records/session-input.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const delivery = Effect.fn("inputs.delivery")(function* (
	input: typeof Source.delivery.Input.Type,
	reject: typeof Source.delivery.reject,
): Effect.fn.Return<typeof Source.delivery.emits.Payload.Type, RejectedBy<typeof Source.delivery.rejections>, Records> {
	const rows = yield* Records;

	const held = yield* rows.sessionInput
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionInputSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(held)) return yield* reject.InputNotFound({ inputId: input.id });
	if (held.value.status === "accepted" || held.value.status === "ambiguous") return yield* reject.DeliverySettled({ inputId: input.id });
	return { id: input.id, status: input.status, detail: input.detail };
});
