import { ChangeChecks, ChangeMergeable, ChangeReview, ChangeStage } from "@antumbra/vocabulary/change";
import { Schema } from "effect";

// why: a change lives on a host that speaks its own dialect, and the window is
// shown only the neutral reading — where it stands and what the host last said
// — so nothing above the domain ever learns which host it is looking at. The
// repo reaches a reader by name; the id is what the rest of the system joins on.
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
