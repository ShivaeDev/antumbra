import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeChecks, ChangeMergeable, ChangeReview, ChangeStage } from "@antumbra/platform-vocabulary/change.ts";
import { Schema } from "effect";
import { ChangeId } from "#ids.ts";
export const change = row(
	"change",
	{
		id: ChangeId,
		repoId: RepoId,
		host: Schema.String,
		title: Schema.String,
		body: Schema.String,
		headRef: Schema.String,
		baseRef: Schema.String,
		headSha: Schema.NullOr(Schema.String),
		preparedHeadRef: Schema.NullOr(Schema.String),
		preparedHeadSha: Schema.NullOr(Schema.String),
		publicationRequestId: Schema.NullOr(Schema.String),
		publicationError: Schema.NullOr(Schema.String),
		proposalFrozenAt: Schema.NullOr(Schema.String),
		worktreePath: Schema.NullOr(Schema.String),
		workingDiff: Schema.NullOr(Schema.String),
		workingTreeStatus: Schema.NullOr(Schema.String),
		submissionKey: Schema.NullOr(Schema.String),
		stage: ChangeStage,
		draftAt: Schema.NullOr(Schema.String),
		url: Schema.NullOr(Schema.String),
		externalId: Schema.NullOr(Schema.String),
		checks: ChangeChecks,
		review: ChangeReview,
		mergeable: ChangeMergeable,
		openedByAgentId: Schema.NullOr(Schema.String),
		originSessionId: Schema.NullOr(Schema.String),
		raw: Schema.NullOr(Schema.String),
		activityAt: Schema.String,
		observedAt: Schema.String,
		landedAt: Schema.NullOr(Schema.String),
		withdrawnAt: Schema.NullOr(Schema.String),
		createdAt: Schema.String,
	},
	{ key: "id", scope: "repoId" },
);
export type ChangeRow = typeof change.Row.Type;
