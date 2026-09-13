import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { changeFeedbackForwarded } from "#facts/change-feedback-forwarded.ts";
import { ChangeId } from "#ids.ts";
import { changeFeedback } from "#rows/change-feedback.ts";
export const forwardFeedback = command("forwardFeedback", {
	input: { changeId: ChangeId, ids: Schema.Array(Schema.String) },
	reads: [changeFeedback],
	emits: changeFeedbackForwarded,
	rejections: {},
	run: Effect.fn("changes.forwardFeedback")(function* (input, rows) {
		const sent = new Set(input.ids);
		const forwarded: string[] = [];
		for (const row of yield* rows.changeFeedback.where({ changeId: input.changeId }))
			if (row.forwardedAt === null && sent.has(row.id)) forwarded.push(row.id);
		return { changeId: input.changeId, ids: forwarded };
	}),
});
