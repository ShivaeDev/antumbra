import { command } from "@antumbra/platform-feature/command.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { Schema } from "effect";
import { changeFeedbackForwarded } from "#facts/change-feedback-forwarded.ts";
import { changeFeedback } from "#rows/change-feedback.ts";
export const forwardFeedback = command("forwardFeedback", {
	input: { changeId: ChangeId, ids: Schema.Array(Schema.String) },
	reads: [changeFeedback],
	emits: changeFeedbackForwarded,
	rejections: {},
});
