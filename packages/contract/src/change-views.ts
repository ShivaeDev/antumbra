import { ChangeChecks, ChangeMergeable, ChangeReview, ChangeStage } from "@antumbra/vocabulary/change.ts";
import { Schema } from "effect";

export const ChangeView = Schema.Struct({
	activityAt: Schema.String,
	checks: ChangeChecks,
	externalId: Schema.NullOr(Schema.String),
	host: Schema.String,
	id: Schema.String,
	isDraft: Schema.Boolean,
	mergeable: ChangeMergeable,
	observedAt: Schema.String,
	repoId: Schema.String,
	repoName: Schema.String,
	review: ChangeReview,
	stage: ChangeStage,
	title: Schema.String,
	url: Schema.NullOr(Schema.String),
});
export type ChangeView = typeof ChangeView.Type;
