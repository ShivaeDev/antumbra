import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeFeedbackKind, ChangeReview } from "@antumbra/platform-vocabulary/change.ts";
import { Schema } from "effect";
import { ChangeId } from "#ids.ts";
export const changeFeedback = row(
	"changeFeedback",
	{
		id: Schema.String,
		changeId: ChangeId,
		kind: ChangeFeedbackKind,
		author: Schema.String,
		verdict: Schema.NullOr(ChangeReview),
		path: Schema.NullOr(Schema.String),
		line: Schema.NullOr(Schema.Number),
		body: Schema.String,
		url: Schema.String,
		at: Schema.String,
		forwardedAt: Schema.NullOr(Schema.String),
	},
	{ key: "id", scope: "changeId" },
);
export type ChangeFeedbackRow = typeof changeFeedback.Row.Type;
