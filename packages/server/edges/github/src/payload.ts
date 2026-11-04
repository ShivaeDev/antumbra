import { Effect, Schema } from "effect";
import { GitHubCheckState, GitHubMergeState, GitHubPullState, GitHubReviewDecision, GitHubReviewState } from "#dialect.ts";
import { type GhOperation, GhOutputInvalid } from "#errors.ts";
import type { ObserveSelection } from "#query.ts";
import { responseSelections } from "#response-selections.ts";

const CheckRollup = Schema.Struct({ state: GitHubCheckState });

const CommitNode = Schema.Struct({
	commit: Schema.Struct({ statusCheckRollup: Schema.NullOr(CheckRollup) }),
});

// GitHub answers a null author for an account that no longer exists.
const Author = Schema.NullOr(Schema.Struct({ login: Schema.String }));

const ReviewCommentNode = Schema.Struct({
	author: Author,
	body: Schema.String,
	createdAt: Schema.String,
	id: Schema.String,
	line: Schema.NullOr(Schema.Number),
	path: Schema.NullOr(Schema.String),
	url: Schema.String,
});

const ReviewNode = Schema.Struct({
	author: Author,
	body: Schema.String,
	comments: Schema.Struct({ nodes: Schema.Array(ReviewCommentNode) }),
	id: Schema.String,
	state: GitHubReviewState,
	submittedAt: Schema.NullOr(Schema.String),
	url: Schema.String,
});

const IssueCommentNode = Schema.Struct({
	author: Author,
	body: Schema.String,
	createdAt: Schema.String,
	id: Schema.String,
	url: Schema.String,
});

// GitHub may add fields without changing this boundary.
export const PullRequestNode = Schema.Struct({
	baseRefName: Schema.String,
	comments: Schema.Struct({ nodes: Schema.Array(IssueCommentNode) }),
	commits: Schema.Struct({ nodes: Schema.Array(CommitNode) }),
	headRefName: Schema.String,
	headRefOid: Schema.NullOr(Schema.String),
	isDraft: Schema.Boolean,
	mergeStateStatus: Schema.NullOr(GitHubMergeState),
	number: Schema.Number,
	reviewDecision: Schema.NullOr(GitHubReviewDecision),
	reviews: Schema.Struct({ nodes: Schema.Array(ReviewNode) }),
	state: GitHubPullState,
	title: Schema.String,
	updatedAt: Schema.String,
	url: Schema.String,
});

export type PullRequestNode = typeof PullRequestNode.Type;

export interface ObservedNode {
	readonly node: PullRequestNode;
	readonly raw: unknown;
	readonly repoId: string;
}

const invalid = (operation: GhOperation) => (cause: unknown) => new GhOutputInvalid({ detail: String(cause), operation });

const decodeNode = (operation: GhOperation, selection: ObserveSelection, raw: unknown): Effect.Effect<ObservedNode, GhOutputInvalid> =>
	Schema.decodeUnknownEffect(PullRequestNode)(raw).pipe(
		Effect.mapError(invalid(operation)),
		Effect.flatMap((node) =>
			node.number === selection.ref.number
				? Effect.succeed({ node, raw, repoId: selection.ref.repoId })
				: Effect.fail(
						new GhOutputInvalid({
							detail: `${selection.pullAlias} answered pull request ${node.number}, expected ${selection.ref.number}`,
							operation,
						}),
					),
		),
	);

export const decodeObserveResponse = (operation: GhOperation, body: unknown, selections: ReadonlyArray<ObserveSelection>) =>
	responseSelections(operation, body, selections).pipe(
		Effect.flatMap((nodes) => Effect.forEach(nodes, ([selection, raw]) => decodeNode(operation, selection, raw))),
	);
