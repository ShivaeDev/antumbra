import type { changeFeedbackForwarded } from "@antumbra/domain-changes/facts/change-feedback-forwarded.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const changeFeedbackForwardedMaterializer = Effect.fn("changes.changeFeedbackForwarded")(function* (
	fact: FactValue<typeof changeFeedbackForwarded>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const forwardedAt = new Date(fact.at).toISOString();
	for (const id of fact.ids) yield* rows.changeFeedback.updateVoid({ ...{ forwardedAt }, id: id }).pipe(Effect.orDie);
});
