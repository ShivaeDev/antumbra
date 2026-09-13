import type { ChangeChecks, ChangeMergeable, ChangeReview, ChangeStage } from "@antumbra/platform-vocabulary/change.ts";
import type { Feedback, Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { Effect } from "effect";
import type { GitHubCheckState, GitHubMergeState, GitHubPullState, GitHubReviewDecision, GitHubReviewState, UnknownGitHubWord } from "#dialect.ts";
import { GhOutputInvalid } from "#errors.ts";
import type { ObservedNode } from "#payload.ts";

type Known<A> = Exclude<A, UnknownGitHubWord>;

const STAGES: Readonly<Record<Known<GitHubPullState>, Exclude<ChangeStage, "prepared">>> = {
	CLOSED: "withdrawn",
	MERGED: "landed",
	OPEN: "open",
};

const MERGEABLES: Readonly<Record<Known<GitHubMergeState>, ChangeMergeable>> = {
	BEHIND: "unknown",
	BLOCKED: "unknown",
	CLEAN: "clean",
	DIRTY: "conflict",
	DRAFT: "unknown",
	HAS_HOOKS: "unknown",
	UNKNOWN: "unknown",
	UNSTABLE: "unknown",
};

const REVIEWS: Readonly<Record<Known<GitHubReviewDecision>, ChangeReview>> = {
	APPROVED: "approved",
	CHANGES_REQUESTED: "changes_requested",
	REVIEW_REQUIRED: "pending",
};

// A dismissed review no longer carries its verdict, but the words the reviewer wrote still stand.
const VERDICTS: Readonly<Record<Exclude<Known<GitHubReviewState>, "PENDING">, ChangeReview>> = {
	APPROVED: "approved",
	CHANGES_REQUESTED: "changes_requested",
	COMMENTED: "commented",
	DISMISSED: "commented",
};

const CHECKS: Readonly<Record<Known<GitHubCheckState>, ChangeChecks>> = {
	ERROR: "red",
	EXPECTED: "pending",
	FAILURE: "red",
	PENDING: "pending",
	SUCCESS: "green",
};

const rollupState = (observed: ObservedNode): GitHubCheckState | null => observed.node.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null;

const known = <A extends string>(observed: ObservedNode, field: string, word: A | UnknownGitHubWord) =>
	typeof word === "string"
		? Effect.succeed(word)
		: Effect.fail(
				new GhOutputInvalid({
					detail: `${field} answered unsupported word ${JSON.stringify(word.raw)}`,
					operation: "observe-changes",
					raw: observed.raw,
				}),
			);

const login = (author: { readonly login: string } | null): string => (author === null ? "ghost" : author.login);

const feedbackOf = (observed: ObservedNode) =>
	Effect.gen(function* () {
		const items: Feedback[] = [];
		for (const review of observed.node.reviews.nodes) {
			const state = yield* known(observed, "reviews.state", review.state);
			if (state === "PENDING" || review.submittedAt === null) continue;
			items.push({
				at: Date.parse(review.submittedAt),
				author: login(review.author),
				body: review.body,
				id: review.id,
				kind: "review",
				line: null,
				path: null,
				url: review.url,
				verdict: VERDICTS[state],
			});
			for (const comment of review.comments.nodes)
				items.push({
					at: Date.parse(comment.createdAt),
					author: login(comment.author),
					body: comment.body,
					id: comment.id,
					kind: "inline",
					line: comment.line,
					path: comment.path,
					url: comment.url,
					verdict: null,
				});
		}
		for (const comment of observed.node.comments.nodes)
			items.push({
				at: Date.parse(comment.createdAt),
				author: login(comment.author),
				body: comment.body,
				id: comment.id,
				kind: "comment",
				line: null,
				path: null,
				url: comment.url,
				verdict: null,
			});
		return items;
	});

export const mapPullRequest = (observed: ObservedNode) =>
	Effect.gen(function* () {
		const { node } = observed;
		const stage = yield* known(observed, "state", node.state);
		const mergeState = node.mergeStateStatus === null ? null : yield* known(observed, "mergeStateStatus", node.mergeStateStatus);
		const reviewDecision = node.reviewDecision === null ? null : yield* known(observed, "reviewDecision", node.reviewDecision);
		const rolledUp = rollupState(observed);
		const checkState = rolledUp === null ? null : yield* known(observed, "statusCheckRollup.state", rolledUp);
		return {
			activityAt: Date.parse(node.updatedAt),
			baseRef: node.baseRefName,
			checks: checkState === null ? "none" : CHECKS[checkState],
			externalId: String(node.number),
			feedback: yield* feedbackOf(observed),
			headRef: node.headRefName,
			headSha: node.headRefOid,
			isDraft: node.isDraft,
			mergeable: mergeState === null ? "unknown" : MERGEABLES[mergeState],
			raw: observed.raw,
			repoId: observed.repoId,
			review: reviewDecision === null ? "none" : REVIEWS[reviewDecision],
			stage: STAGES[stage],
			title: node.title,
			url: node.url,
		} satisfies Observation;
	});
