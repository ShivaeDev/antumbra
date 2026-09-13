import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { changeFeedbackForwarded } from "#facts/change-feedback-forwarded.ts";
import { changeFeedback } from "#rows/change-feedback.ts";
export const changeFeedbackForwardedMaterializer = materializer(changeFeedbackForwarded, {
	writes: [changeFeedback],
	run: Effect.fn("changes.changeFeedbackForwarded")(function* (fact, rows) {
		const forwardedAt = new Date(fact.at).toISOString();
		for (const id of fact.ids) yield* rows.changeFeedback.update(id, { forwardedAt });
	}),
});
