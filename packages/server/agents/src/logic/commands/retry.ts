import type * as Source from "@antumbra/domain-agents/commands/retry.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const retry = Effect.fn("Agents.retry")(function* (
	input: typeof Source.retry.Input.Type,
	reject: typeof Source.retry.reject,
): Effect.fn.Return<typeof Source.retry.emits.Payload.Type, RejectedBy<typeof Source.retry.rejections>, Records> {
	const rows = yield* Records;

	const held = yield* rows.birth
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(held)) return yield* reject.Unknown({ id: input.id });
	if (held.value.status !== "waiting") return yield* reject.NotAllowed({ id: input.id, status: held.value.status });
	return { id: input.id };
});
