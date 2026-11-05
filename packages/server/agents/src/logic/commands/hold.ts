import type * as Source from "@antumbra/domain-agents/commands/hold.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const hold = Effect.fn("Agents.hold")(function* (
	input: typeof Source.hold.Input.Type,
	reject: typeof Source.hold.reject,
): Effect.fn.Return<typeof Source.hold.emits.Payload.Type, RejectedBy<typeof Source.hold.rejections>, Records> {
	const rows = yield* Records;

	const held = yield* rows.birth
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(held) || held.value.status !== "admitted") return yield* reject.Unavailable({ id: input.id });
	return { id: input.id, reason: input.reason };
});
