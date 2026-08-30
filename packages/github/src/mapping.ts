import type { ChangeChecks, ChangeMergeable, ChangeObservation, ChangeReview, ChangeStage } from "@antumbra/plugin-api";
import { Effect } from "effect";
import type { GitHubCheckState, GitHubMergeState, GitHubPullState, GitHubReviewDecision, UnknownGitHubWord } from "#dialect.ts";
import { GhOutputInvalid } from "#errors.ts";
import type { ObservedNode } from "#payload.ts";

// why: GitHub's known dialect is translated through total tables. A future
// word stays tagged as provider evidence and fails this projection instead of
// being mistaken for one of Antumbra's neutral facts.
type Known<A> = Exclude<A, UnknownGitHubWord>;

const STAGES: Readonly<Record<Known<GitHubPullState>, Exclude<ChangeStage, "prepared">>> = {
	CLOSED: "withdrawn",
	MERGED: "landed",
	OPEN: "open",
};

// why: only CLEAN and DIRTY say something about the merge itself. BLOCKED,
// BEHIND, UNSTABLE, HAS_HOOKS and DRAFT all describe policy or freshness, and
// a merged pull request reports UNKNOWN — none of them is a conflict.
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

// why: an unreadable timestamp reads as the beginning of time, which puts the
// change outside every recency window — the watcher slows down rather than
// spinning on a row it cannot date.
const epochMillis = (iso: string): number => {
	const parsed = Date.parse(iso);
	return Number.isNaN(parsed) ? 0 : parsed;
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
			activityAt: epochMillis(node.updatedAt),
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
