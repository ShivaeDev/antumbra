import { Effect, Schema } from "effect";
import { GitHubCheckState, GitHubMergeState, GitHubPullState, GitHubReviewDecision } from "#dialect.ts";
import { type GhOperation, GhOutputInvalid } from "#errors.ts";
import type { ObserveSelection } from "#query.ts";

const CheckRollup = Schema.Struct({ state: GitHubCheckState });

const CommitNode = Schema.Struct({
	commit: Schema.Struct({ statusCheckRollup: Schema.NullOr(CheckRollup) }),
});

// GitHub may add fields without changing this boundary.
export const PullRequestNode = Schema.Struct({
	baseRefName: Schema.String,
	commits: Schema.Struct({ nodes: Schema.Array(CommitNode) }),
	headRefName: Schema.String,
	headRefOid: Schema.NullOr(Schema.String),
	isDraft: Schema.Boolean,
	mergeStateStatus: Schema.NullOr(GitHubMergeState),
	number: Schema.Number,
	reviewDecision: Schema.NullOr(GitHubReviewDecision),
	state: GitHubPullState,
	title: Schema.String,
	updatedAt: Schema.String,
	url: Schema.String,
});

export type PullRequestNode = typeof PullRequestNode.Type;

const ObserveEnvelope = Schema.Struct({
	data: Schema.Record(Schema.String, Schema.NullOr(Schema.Record(Schema.String, Schema.Unknown))),
});

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

// GitHub returns null for a pull request this login cannot see.
const aliasedNodes = (
	data: Readonly<Record<string, Readonly<Record<string, unknown>> | null>>,
	selections: ReadonlyArray<ObserveSelection>,
): ReadonlyArray<readonly [ObserveSelection, unknown]> =>
	selections.flatMap((selection) => {
		const node = data[selection.repoAlias]?.[selection.pullAlias];
		return node === null || node === undefined ? [] : [[selection, node]];
	});

export const decodeObserveResponse = (
	operation: GhOperation,
	stdout: string,
	selections: ReadonlyArray<ObserveSelection>,
): Effect.Effect<ReadonlyArray<ObservedNode>, GhOutputInvalid> =>
	Schema.decodeUnknownEffect(Schema.fromJsonString(ObserveEnvelope))(stdout).pipe(
		Effect.mapError(invalid(operation)),
		Effect.flatMap((envelope) =>
			Effect.forEach(aliasedNodes(envelope.data, selections), ([selection, raw]) => decodeNode(operation, selection, raw)),
		),
	);
