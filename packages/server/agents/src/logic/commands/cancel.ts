import type * as Source from "@antumbra/domain-agents/commands/cancel.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const cancel = Effect.fn("Agents.cancel")(function* (
	input: typeof Source.cancel.Input.Type,
	reject: typeof Source.cancel.reject,
): Effect.fn.Return<typeof Source.cancel.emits.Payload.Type, RejectedBy<typeof Source.cancel.rejections>, Records> {
	const rows = yield* Records;

	const held = yield* rows.birth
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(held)) return yield* reject.Unknown({ id: input.id });
	if (held.value.status !== "requested" && held.value.status !== "waiting")
		return yield* reject.NotAllowed({ id: input.id, status: held.value.status });
	return { id: input.id };
});
