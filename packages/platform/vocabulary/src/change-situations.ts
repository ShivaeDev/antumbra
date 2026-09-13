import type { ChangeFeedbackKind, ChangeReview, ChangeSituation } from "@antumbra/platform-vocabulary/change.ts";

export interface SituationFeedback {
	readonly author: string;
	readonly kind: ChangeFeedbackKind;
	readonly verdict: ChangeReview | null;
	readonly path: string | null;
	readonly line: number | null;
	readonly body: string;
	readonly url: string;
}

export interface SituationInput {
	readonly baseRef: string;
	readonly feedback: readonly SituationFeedback[];
	readonly headRef: string;
	readonly reference: string;
	readonly repo: string;
}

export interface SituationWords {
	readonly label: string;
	readonly text: string;
}

const verdictWord = (verdict: ChangeReview | null): string => {
	if (verdict === "approved") return "approved";
	if (verdict === "changes_requested") return "requested changes";
	return "reviewed";
};

const header = (item: SituationFeedback): string => {
	if (item.kind === "review") return `${item.author} ${verdictWord(item.verdict)}`;
	if (item.kind === "comment" || item.path === null) return `${item.author} commented`;
	return `${item.author} commented on ${item.path}${item.line === null ? "" : `:${item.line}`}`;
};

const quoted = (body: string): readonly string[] => {
	const trimmed = body.replaceAll("\r\n", "\n").trim();
	return trimmed === "" ? [] : trimmed.split("\n").map((line) => (line.trim() === "" ? ">" : `> ${line}`));
};

const block = (item: SituationFeedback): string => [header(item), ...quoted(item.body), item.url].join("\n");

const counted = (count: number): string => `${count} comment${count === 1 ? "" : "s"}`;

export const mergeConflicts = (input: SituationInput): SituationWords => ({
	label: `Resolve conflicts ${input.reference}`,
	text: `Change ${input.reference} in ${input.repo} has merge conflicts: ${input.headRef} no longer merges cleanly into ${input.baseRef}.

Bring ${input.headRef} up to date with ${input.baseRef} and resolve the conflicts. Keep what both sides meant — a conflict settled by dropping one side is a change nobody asked for. Push once the branch merges cleanly, and say what you resolved.`,
});

export const checksFailed = (input: SituationInput): SituationWords => ({
	label: `Fix failing checks ${input.reference}`,
	text: `Checks are failing on change ${input.reference} in ${input.repo}, on branch ${input.headRef}.

Read the failing checks on the change, find what actually broke, and fix it. Never disable, skip, or weaken a check to make it pass. If a check failed for something you did not cause, say which one and why.`,
});

export const unresolvedReviews = (input: SituationInput): SituationWords => ({
	label: `Answer review comments ${input.reference}`,
	text: `Change ${input.reference} in ${input.repo} has review comments waiting on branch ${input.headRef}.

Read the unresolved threads on the change and answer every one: change the code where the reviewer is right, and say why where you disagree. Push the changes together, then say here what you did about each one; never reply on the change itself.`,
});

export const feedbackWaiting = (input: SituationInput): SituationWords => ({
	label: `${counted(input.feedback.length)} on ${input.reference}`,
	text: `Change ${input.reference} in ${input.repo} has ${input.feedback.length} new comment${input.feedback.length === 1 ? "" : "s"} on branch ${input.headRef}, quoted below.

Answer every point: change the code where the reviewer is right, and say why where you disagree. Reply here, not on the change — what you write is what gets relayed. Push, then say what you did about each point.

${input.feedback.map(block).join("\n\n")}`,
});

export const situationWords: Readonly<Record<ChangeSituation, (input: SituationInput) => SituationWords>> = {
	checks_failed: checksFailed,
	feedback_waiting: feedbackWaiting,
	merge_conflicts: mergeConflicts,
	unresolved_reviews: unresolvedReviews,
};
