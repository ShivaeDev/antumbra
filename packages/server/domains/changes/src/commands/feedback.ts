import type { ChangeReview } from "@antumbra/platform-vocabulary/change.ts";
import { type Feedback, type Observation, postedByAntumbra } from "@antumbra/platform-vocabulary/change-host.ts";
import type { ChangeId } from "#ids.ts";
import type { ChangeFeedbackRow } from "#rows/change-feedback.ts";

const worthKeeping = (item: Feedback): boolean => item.body.trim() !== "" && !postedByAntumbra(item.body);

export const observedReview = (seen: Observation): ChangeReview => {
	if (seen.review === "approved" || seen.review === "changes_requested") return seen.review;
	const reviewed = seen.feedback.some((item) => item.kind === "review" && !postedByAntumbra(item.body));
	return reviewed ? "commented" : seen.review;
};

export const freshFeedback = (changeId: ChangeId, seen: Observation, held: readonly ChangeFeedbackRow[]): readonly ChangeFeedbackRow[] => {
	const known = new Map(held.map((row) => [row.id, row]));
	const fresh: ChangeFeedbackRow[] = [];
	for (const item of seen.feedback) {
		const before = known.get(item.id);
		if (!worthKeeping(item) || before?.body === item.body) continue;
		fresh.push({
			id: item.id,
			changeId,
			kind: item.kind,
			author: item.author,
			verdict: item.verdict,
			path: item.path,
			line: item.line,
			body: item.body,
			url: item.url,
			at: new Date(item.at).toISOString(),
			forwardedAt: null,
		});
	}
	return fresh;
};
