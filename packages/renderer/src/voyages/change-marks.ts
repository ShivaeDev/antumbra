import type { ChangeView } from "@antumbra/contract";

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

export const changeMarks = (change: ChangeView): string => {
	if (change.stage === "landed") {
		return "✓ merged";
	}
	return [STAGE_LABELS[change.stage], CHECK_MARKS[change.checks], REVIEW_MARKS[change.review], MERGEABLE_MARKS[change.mergeable]]
		.filter((glyph) => glyph !== "")
		.join(" · ");
};

export const changeName = (change: ChangeView): string => (change.externalId === null ? change.title : `#${change.externalId} ${change.title}`);
