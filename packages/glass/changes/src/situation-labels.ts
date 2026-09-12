import type { ChangeSituation } from "@antumbra/platform-vocabulary/change.ts";
export const situationLabel: Readonly<Record<ChangeSituation, string>> = {
	checks_failed: "Fix failing checks",
	merge_conflicts: "Resolve conflicts",
	unresolved_reviews: "Answer review comments",
};
