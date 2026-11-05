import type * as Source from "@antumbra/domain-changes/commands/archive.ts";
import { change as changeRecordSchema } from "@antumbra/domain-changes/rows/change.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";
export const archive = Effect.fn("changes.archive")(function* (
	input: typeof Source.archive.Input.Type,
	reject: typeof Source.archive.reject,
): Effect.fn.Return<typeof Source.archive.emits.Payload.Type, RejectedBy<typeof Source.archive.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.change.count({ where: { id: input.changeId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownChange({ id: input.changeId });
	const held = yield* rows.change.findById(input.changeId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(changeRecordSchema.Row)), Effect.orDie);
	if (held.stage !== "landed" && held.stage !== "withdrawn") return yield* reject.ChangeStillOpen({ id: held.id, stage: held.stage });
	return { changeId: held.id };
});
