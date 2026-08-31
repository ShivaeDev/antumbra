import type { ChangeSituation } from "@antumbra/contract";

export const situationLabel: Readonly<Record<ChangeSituation, string>> = {
	checks_failed: "Fix failing checks",
	merge_conflicts: "Resolve conflicts",
	unresolved_reviews: "Answer review comments",
};
