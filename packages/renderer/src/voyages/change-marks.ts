import type { ChangeView } from "@antumbra/contract";

// why: every neutral word is named here, including intentional blanks. A new
// vocabulary value is therefore a compile error until the view decides how it
// reads instead of silently disappearing or printing its wire spelling.
const STAGE_LABELS: Readonly<Record<ChangeView["stage"], string>> = {
	landed: "landed",
	open: "open",
	prepared: "prepared",
	withdrawn: "withdrawn",
};

const CHECK_MARKS: Readonly<Record<ChangeView["checks"], string>> = {
	green: "✓",
	none: "○",
	pending: "…",
	red: "✗",
};

const REVIEW_MARKS: Readonly<Record<ChangeView["review"], string>> = {
	approved: "✓",
	changes_requested: "✎",
	none: "",
	pending: "…",
};

const MERGEABLE_MARKS: Readonly<Record<ChangeView["mergeable"], string>> = {
	clean: "⚓",
	conflict: "⚡",
	unknown: "",
};

// why: a landed change has nothing left to say about checks or reviewers — it
// merged, and that is the whole of its state.
export const changeMarks = (change: ChangeView): string => {
	if (change.stage === "landed") {
		return "✓ merged";
	}
	return [
		STAGE_LABELS[change.stage],
		CHECK_MARKS[change.checks],
		REVIEW_MARKS[change.review],
		MERGEABLE_MARKS[change.mergeable],
	]
		.filter((glyph) => glyph !== "")
		.join(" · ");
};

// why: a change that never reached a host has no number to show, so it is
// named by its title alone rather than by a number nobody can look up.
export const changeName = (change: ChangeView): string =>
	change.externalId === null
		? change.title
		: `#${change.externalId} ${change.title}`;
