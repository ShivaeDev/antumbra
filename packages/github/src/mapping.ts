import type { ChangeChecks, ChangeMergeable, ChangeObservation, ChangeReview, ChangeStage } from "@antumbra/plugin-api";
import { Effect } from "effect";
import type { GitHubCheckState, GitHubMergeState, GitHubPullState, GitHubReviewDecision, UnknownGitHubWord } from "#dialect.ts";
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
		} satisfies ChangeObservation;
	});
