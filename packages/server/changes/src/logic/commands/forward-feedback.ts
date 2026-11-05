import type * as Source from "@antumbra/domain-changes/commands/forward-feedback.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as changeFeedbackSelection } from "@antumbra/server-storage/records/change-feedback.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const forwardFeedback = Effect.fn("changes.forwardFeedback")(function* (
	input: typeof Source.forwardFeedback.Input.Type,
): Effect.fn.Return<typeof Source.forwardFeedback.emits.Payload.Type, RejectedBy<typeof Source.forwardFeedback.rejections>, Records> {
	const rows = yield* Records;

	const sent = new Set(input.ids);
	const forwarded: string[] = [];
	for (const row of yield* rows.changeFeedback
		.findMany({ where: { changeId: input.changeId }, orderBy: { field: "storage_order", direction: "asc" }, select: changeFeedbackSelection })
		.pipe(Effect.orDie))
		if (row.forwardedAt === null && sent.has(row.id)) forwarded.push(row.id);
	return { changeId: input.changeId, ids: forwarded };
});
