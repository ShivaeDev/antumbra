import type { ChangeRow } from "@antumbra/changes";
import type { ChangeSituation } from "@antumbra/contract";
import { type AgentPrompt, checksFailed, mergeConflicts, unresolvedReviews } from "@antumbra/prompts";

// Drafts identify the observed change; volatile check and review details stay on the host.
export const situationWords = (situation: ChangeSituation, change: ChangeRow, repo: string): AgentPrompt => {
	const facts = {
		headRef: change.headRef,
		reference: `#${change.externalId}`,
		repo,
	};
	switch (situation) {
		case "merge_conflicts":
			return mergeConflicts({ ...facts, baseRef: change.baseRef });
		case "checks_failed":
			return checksFailed(facts);
		case "unresolved_reviews":
			return unresolvedReviews(facts);
	}
};
