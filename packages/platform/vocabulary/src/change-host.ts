import { ChangeChecks, ChangeFeedbackKind, ChangeMergeable, ChangeReview } from "@antumbra/platform-vocabulary/change.ts";
import { Schema } from "effect";
export const HostRepo = Schema.Struct({ id: Schema.String, name: Schema.String, source: Schema.String, defaultRef: Schema.String });
export type HostRepo = typeof HostRepo.Type;
export const ANTUMBRA_TRAILER = "Opened through Antumbra";
export const postedByAntumbra = (body: string): boolean => body.includes(ANTUMBRA_TRAILER);
export const Feedback = Schema.Struct({
	id: Schema.String,
	kind: ChangeFeedbackKind,
	author: Schema.String,
	verdict: Schema.NullOr(ChangeReview),
	path: Schema.NullOr(Schema.String),
	line: Schema.NullOr(Schema.Number),
	body: Schema.String,
	url: Schema.String,
	at: Schema.Number,
});
export type Feedback = typeof Feedback.Type;
export const Observation = Schema.Struct({
	repoId: Schema.String,
	externalId: Schema.String,
	activityAt: Schema.Number,
	baseRef: Schema.String,
	headRef: Schema.String,
	headSha: Schema.NullOr(Schema.String),
	isDraft: Schema.Boolean,
	checks: ChangeChecks,
	review: ChangeReview,
	mergeable: ChangeMergeable,
	stage: Schema.Literals(["open", "landed", "withdrawn"]),
	feedback: Schema.Array(Feedback),
	raw: Schema.Unknown,
	title: Schema.String,
	url: Schema.String,
});
export type Observation = typeof Observation.Type;
export const OpenRequest = Schema.Struct({
	submissionId: Schema.String,
	repo: HostRepo,
	berth: Schema.Struct({ branch: Schema.String, path: Schema.String }),
	headSha: Schema.String,
	base: Schema.NullOr(Schema.String),
	title: Schema.String,
	body: Schema.String,
	draft: Schema.Boolean,
});
export type OpenRequest = typeof OpenRequest.Type;
export const ChangeRef = Schema.Struct({ repo: HostRepo, externalId: Schema.String });
export type ChangeRef = typeof ChangeRef.Type;
export const Capability = Schema.Struct({ available: Schema.Boolean, detail: Schema.String });
export type Capability = typeof Capability.Type;
