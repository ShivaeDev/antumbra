import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { ChangeId } from "#ids.ts";
export const changeFeedbackForwarded = fact("ChangeFeedbackForwarded", {
	changeId: ChangeId,
	ids: Schema.Array(Schema.String),
});
