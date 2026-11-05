import type * as Source from "@antumbra/domain-agents/commands/delay.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const delay = Effect.fn("Agents.delay")(function* (
	input: typeof Source.delay.Input.Type,
	reject: typeof Source.delay.reject,
): Effect.fn.Return<typeof Source.delay.emits.Payload.Type, RejectedBy<typeof Source.delay.rejections>, Records> {
	const rows = yield* Records;

	const held = yield* rows.birth
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(held) || held.value.status !== "requested") return yield* reject.Unavailable({ id: input.id });
	return { id: input.id, reason: input.reason };
});
