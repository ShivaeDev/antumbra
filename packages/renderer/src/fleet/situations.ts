import type { ChangeSituation } from "@antumbra/contract";

// why: every situation the domain can publish is named here in the register
// the window speaks, so a new one is a compile error rather than a wire
// spelling leaking onto a control.
export const situationLabel: Readonly<Record<ChangeSituation, string>> = {
	checks_failed: "Fix failing checks",
	merge_conflicts: "Resolve conflicts",
	unresolved_reviews: "Answer review comments",
};
