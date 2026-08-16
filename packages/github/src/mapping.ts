import type {
	ChangeChecks,
	ChangeMergeable,
	ChangeObservation,
	ChangeReview,
	ChangeStage,
} from "@antumbra/plugin-api";
import type { ObservedNode } from "#payload.ts";

// why: GitHub's dialect is translated through total tables, so a word this
// build has never seen reads as the cautious answer rather than crashing a
// watcher pass. Cautious means: never settle a change, never claim a signal.
const STAGES: Readonly<Record<string, Exclude<ChangeStage, "prepared">>> = {
	CLOSED: "withdrawn",
	MERGED: "landed",
	OPEN: "open",
};

// why: only CLEAN and DIRTY say something about the merge itself. BLOCKED,
// BEHIND, UNSTABLE, HAS_HOOKS and DRAFT all describe policy or freshness, and
// a merged pull request reports UNKNOWN — none of them is a conflict.
const MERGEABLES: Readonly<Record<string, ChangeMergeable>> = {
	CLEAN: "clean",
	DIRTY: "conflict",
};

const REVIEWS: Readonly<Record<string, ChangeReview>> = {
	APPROVED: "approved",
	CHANGES_REQUESTED: "changes_requested",
	REVIEW_REQUIRED: "pending",
};

const CHECKS: Readonly<Record<string, ChangeChecks>> = {
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

const rollupState = (observed: ObservedNode): string | null =>
	observed.node.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null;

export const mapPullRequest = (observed: ObservedNode): ChangeObservation => {
	const { node } = observed;
	return {
		activityAt: epochMillis(node.updatedAt),
		baseRef: node.baseRefName,
		checks: CHECKS[rollupState(observed) ?? ""] ?? "none",
		externalId: String(node.number),
		headRef: node.headRefName,
		headSha: node.headRefOid,
		isDraft: node.isDraft,
		mergeable: MERGEABLES[node.mergeStateStatus ?? ""] ?? "unknown",
		raw: observed.raw,
		repoId: observed.repoId,
		review: REVIEWS[node.reviewDecision ?? ""] ?? "none",
		stage: STAGES[node.state] ?? "open",
		title: node.title,
		url: node.url,
	};
};
